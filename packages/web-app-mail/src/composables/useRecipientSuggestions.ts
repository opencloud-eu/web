import { ref } from 'vue'
import { useTask } from 'vue-concurrency'
import { z } from 'zod'
import { urlJoin } from '@opencloud-eu/web-client'
import { useClientService, useConfigStore } from '@opencloud-eu/web-pkg'

export type RecipientSuggestion = {
  name: string
  email: string
}

const SUGGESTIONS_LIMIT = 10
// the contacts of an account are loaded once and filtered locally while typing
const RECIPIENTS_LIMIT = 1000
const RECIPIENTS_CACHE_MS = 5 * 60 * 1000
export const MIN_SEARCH_TERM_LENGTH = 2

const SuggestionContactSchema = z.object({
  id: z.string(),
  name: z
    .object({
      full: z.string().optional(),
      components: z.array(z.object({ kind: z.string(), value: z.string() })).optional()
    })
    .optional(),
  emails: z.record(z.string(), z.object({ address: z.string() })).optional()
})

const SuggestionContactsResponseSchema = z.object({
  results: z.array(SuggestionContactSchema).optional()
})

type SuggestionContact = z.infer<typeof SuggestionContactSchema>

const getContactName = ({ name }: SuggestionContact) => {
  if (name?.full?.trim()) {
    return name.full.trim()
  }
  return (name?.components || [])
    .filter(({ kind }) => kind !== 'separator')
    .map(({ value }) => value.trim())
    .filter(Boolean)
    .join(' ')
}

/**
 * Turns contacts into one suggestion per email address, without duplicates.
 */
export const getRecipientSuggestions = (contacts: SuggestionContact[]): RecipientSuggestion[] => {
  const suggestions = new Map<string, RecipientSuggestion>()
  contacts.forEach((contact) => {
    const name = getContactName(contact)
    Object.values(contact.emails || {}).forEach(({ address }) => {
      const email = address.trim()
      if (email && !suggestions.has(email.toLowerCase())) {
        suggestions.set(email.toLowerCase(), { name, email })
      }
    })
  })
  return [...suggestions.values()]
}

const getSearchTokens = ({ name, email }: RecipientSuggestion) => {
  return [email, ...`${name} ${email}`.split(/[\s.@_-]+/)]
    .map((token) => token.toLowerCase())
    .filter(Boolean)
}

/**
 * Suggestions match if the name, the email address or one of their words start with the term.
 */
export const filterRecipientSuggestions = (recipients: RecipientSuggestion[], term: string) => {
  const searchTerm = term.trim().toLowerCase()
  return recipients
    .filter((recipient) => getSearchTokens(recipient).some((token) => token.startsWith(searchTerm)))
    .slice(0, SUGGESTIONS_LIMIT)
}

const recipientsCache = new Map<string, { loadedAt: number; recipients: RecipientSuggestion[] }>()

export const clearRecipientsCache = () => {
  recipientsCache.clear()
}

export const useRecipientSuggestions = () => {
  const clientService = useClientService()
  const configStore = useConfigStore()
  const suggestions = ref<RecipientSuggestion[]>([])

  function* loadRecipients(signal: AbortSignal, accountId: string) {
    const cached = recipientsCache.get(accountId)
    if (cached && Date.now() - cached.loadedAt < RECIPIENTS_CACHE_MS) {
      return cached.recipients
    }

    // the contact search of the mail server only matches whole words, which doesn't work for
    // suggestions while typing. That's why the contacts are loaded once and filtered locally.
    const { data } = yield clientService.httpAuthenticated.get(
      urlJoin(configStore.groupwareUrl, `accounts/${accountId}/contacts`),
      { params: { limit: RECIPIENTS_LIMIT }, signal }
    )
    const parsed = SuggestionContactsResponseSchema.safeParse(data)
    const recipients = getRecipientSuggestions(parsed.success ? parsed.data.results || [] : [])
    recipientsCache.set(accountId, { loadedAt: Date.now(), recipients })
    return recipients
  }

  const searchTask = useTask(function* (signal, accountId: string, term: string) {
    try {
      const recipients: RecipientSuggestion[] = yield* loadRecipients(signal, accountId)
      suggestions.value = filterRecipientSuggestions(recipients, term)
    } catch (error) {
      console.error('Failed to load recipient suggestions:', error)
      suggestions.value = []
    }
  }).restartable()

  const searchSuggestions = (accountId: string, term: string) => {
    if (!accountId || term.trim().length < MIN_SEARCH_TERM_LENGTH) {
      searchTask.cancelAll()
      suggestions.value = []
      return
    }
    searchTask.perform(accountId, term)
  }

  const clearSuggestions = () => {
    searchTask.cancelAll()
    suggestions.value = []
  }

  return {
    suggestions,
    searchSuggestions,
    clearSuggestions
  }
}
