import { computed, ref } from 'vue'
import { useTask } from 'vue-concurrency'
import { ClientService, useClientService, useConfigStore, useMessages } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import { useContactsStore } from './piniaStores/contacts'
import { parseContactsResponse, type Contact } from '../types'
import { urlJoin } from '@opencloud-eu/web-client'

// number of contacts requested at once, large address books are loaded in several pages
export const CONTACTS_PAGE_SIZE = 250

/**
 * The groupware API omits `results` for empty pages (and answers `null` after the last page),
 * these are treated as pages without contacts.
 */
const parseContactsPage = (data: unknown): { contacts: Contact[]; total?: number } => {
  const isEmptyPage =
    !data ||
    (typeof data === 'object' &&
      !Array.isArray(data) &&
      !['results', 'list', 'id'].some((key) => key in data))
  if (isEmptyPage) {
    return { contacts: [] }
  }
  const total = (data as { total?: unknown }).total
  return {
    contacts: parseContactsResponse(data),
    ...(typeof total === 'number' && { total })
  }
}

/**
 * Loads all pages of a contacts list endpoint, to be used with `yield*` inside a task.
 * The contacts are collected by id in the given map (pages might overlap), so the contacts of
 * the pages loaded before a failure are still available to the caller.
 */
export function* requestContactPages(
  clientService: ClientService,
  url: string,
  signal: AbortSignal,
  contacts = new Map<string, Contact>()
): Generator<Promise<unknown>, Contact[], { data: unknown; headers?: Record<string, string> }> {
  const usedNextTokens = new Set<string>()
  let next: string | undefined

  do {
    const { data, headers } = yield clientService.httpAuthenticated.get(url, {
      params: { limit: CONTACTS_PAGE_SIZE, ...(next && { next }) },
      signal
    })
    const page = parseContactsPage(data)
    const previousSize = contacts.size
    page.contacts.forEach((contact) => contacts.set(contact.id, contact))

    // the API also returns a next token after the last page, so stop at pages without new
    // contacts and at tokens that have been used already
    const isComplete =
      contacts.size === previousSize || (page.total !== undefined && contacts.size >= page.total)
    next = isComplete ? undefined : headers?.next
    if (next && usedNextTokens.has(next)) {
      next = undefined
    }
    if (next) {
      usedNextTokens.add(next)
    }
  } while (next)

  return [...contacts.values()]
}

let loadContactsTask: ReturnType<typeof useTask> | null = null
const isLoading = computed(() => loadContactsTask?.isRunning ?? false)
const error = ref<Error>()
let lastLoadArgs: [accountId: string, addressBookId: string] | undefined

export const useLoadContacts = () => {
  const configStore = useConfigStore()
  const clientService = useClientService()
  const { setContacts } = useContactsStore()
  const { showMessage } = useMessages()
  const { $gettext } = useGettext()

  if (!loadContactsTask) {
    loadContactsTask = useTask(function* (signal, accountId: string, addressBookId: string) {
      error.value = undefined
      const contacts = new Map<string, Contact>()

      try {
        yield* requestContactPages(
          clientService,
          urlJoin(
            configStore.groupwareUrl,
            `accounts/${accountId}/addressbooks/${addressBookId}/contacts`
          ),
          signal,
          contacts
        )
      } catch (e) {
        if (!contacts.size) {
          console.error('Failed to load contacts:', e)
          setContacts([])
          error.value = e
          throw e
        }

        // keep the contacts of the pages that have been loaded already
        console.error('Failed to load all contacts:', e)
        showMessage({
          title: $gettext('Not all contacts could be loaded'),
          status: 'warning'
        })
      }

      const result = [...contacts.values()]
      setContacts(result)
      return result
    }).restartable()
  }

  const loadContacts = (accountId: string, addressBookId: string) => {
    lastLoadArgs = [accountId, addressBookId]
    return loadContactsTask!.perform(accountId, addressBookId)
  }

  const reloadContacts = () => {
    if (!lastLoadArgs) {
      return
    }
    return loadContacts(...lastLoadArgs)
  }

  return {
    loadContacts,
    reloadContacts,
    loadContactsTask,
    isLoading,
    error
  }
}
