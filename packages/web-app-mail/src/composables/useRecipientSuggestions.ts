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
// the contacts of an account are loaded once and filtered locally while typing. Accounts with
// more contacts only get suggestions from the first ones, as long as the groupware API has no
// search that matches the beginning of words.
const RECIPIENTS_LIMIT = 1000
const RECIPIENTS_CACHE_MS = 5 * 60 * 1000
// failed requests are retried after a short time instead of on every key stroke
const FAILED_RECIPIENTS_CACHE_MS = 30 * 1000
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
  results: z.array(z.unknown()).optional()
})

type SuggestionContact = z.infer<typeof SuggestionContactSchema>

// contacts are parsed one by one, so a single unexpected contact doesn't hide all suggestions
const parseSuggestionContacts = (data: unknown): SuggestionContact[] => {
  const response = SuggestionContactsResponseSchema.safeParse(data)
  if (!response.success) {
    return []
  }
  return (response.data.results || []).flatMap((value) => {
    const contact = SuggestionContactSchema.safeParse(value)
    return contact.success ? [contact.data] : []
  })
}

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

// e.g. "Zoë" is found with "zoe"
const normalize = (value: string) => {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

const getSearchTokens = ({ name, email }: RecipientSuggestion) => {
  return [email, ...`${name} ${email}`.split(/[\s.@_-]+/)].map(normalize).filter(Boolean)
}

/**
 * Suggestions match if the name, the email address or one of their words start with the term.
 * Recipients that have been added already are not suggested again.
 */
export const filterRecipientSuggestions = (
  recipients: RecipientSuggestion[],
  term: string,
  excludedEmails: string[] = []
) => {
  const searchTerm = normalize(term.trim())
  const excluded = new Set(excludedEmails.map((email) => email.trim().toLowerCase()))
  return recipients
    .filter(({ email }) => !excluded.has(email.toLowerCase()))
    .filter((recipient) => getSearchTokens(recipient).some((token) => token.startsWith(searchTerm)))
    .slice(0, SUGGESTIONS_LIMIT)
}

const recipientsCache = new Map<
  string,
  { loadedAt: number; maxAge: number; request: Promise<RecipientSuggestion[]> }
>()

export const clearRecipientsCache = () => {
  recipientsCache.clear()
}

export const useRecipientSuggestions = () => {
  const clientService = useClientService()
  const configStore = useConfigStore()
  const suggestions = ref<RecipientSuggestion[]>([])

  function loadRecipients(accountId: string) {
    const cached = recipientsCache.get(accountId)
    if (cached && Date.now() - cached.loadedAt < cached.maxAge) {
      return cached.request
    }

    // the contact search of the mail server only matches whole words, which doesn't work for
    // suggestions while typing. That's why the contacts are loaded once and filtered locally.
    // The request is shared by all searches of the account, so typing doesn't cancel it.
    const request = clientService.httpAuthenticated
      .get(urlJoin(configStore.groupwareUrl, `accounts/${accountId}/contacts`), {
        params: { limit: RECIPIENTS_LIMIT }
      })
      .then(({ data }) => getRecipientSuggestions(parseSuggestionContacts(data)))
    const cacheEntry = { loadedAt: Date.now(), maxAge: RECIPIENTS_CACHE_MS, request }
    recipientsCache.set(accountId, cacheEntry)

    request.catch((error) => {
      console.error('Failed to load recipient suggestions:', error)
      cacheEntry.loadedAt = Date.now()
      cacheEntry.maxAge = FAILED_RECIPIENTS_CACHE_MS
    })
    return request
  }

  const searchTask = useTask(function* (
    _signal,
    accountId: string,
    term: string,
    excludedEmails: string[]
  ) {
    try {
      const recipients: RecipientSuggestion[] = yield loadRecipients(accountId)
      suggestions.value = filterRecipientSuggestions(recipients, term, excludedEmails)
    } catch {
      suggestions.value = []
    }
  }).restartable()

  const searchSuggestions = (accountId: string, term: string, excludedEmails: string[] = []) => {
    if (!accountId || term.trim().length < MIN_SEARCH_TERM_LENGTH) {
      searchTask.cancelAll()
      suggestions.value = []
      return
    }
    searchTask.perform(accountId, term, excludedEmails)
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
