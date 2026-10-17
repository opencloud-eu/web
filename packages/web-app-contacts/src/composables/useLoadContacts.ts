import { computed, ref } from 'vue'
import { useTask } from 'vue-concurrency'
import { useClientService, useConfigStore } from '@opencloud-eu/web-pkg'
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

let loadContactsTask: ReturnType<typeof useTask> | null = null
const isLoading = computed(() => loadContactsTask?.isRunning ?? false)
const error = ref<Error>()
let lastLoadArgs: [accountId: string, addressBookId: string] | undefined

export const useLoadContacts = () => {
  const configStore = useConfigStore()
  const clientService = useClientService()
  const { setContacts } = useContactsStore()

  if (!loadContactsTask) {
    loadContactsTask = useTask(function* (signal, accountId: string, addressBookId: string) {
      error.value = undefined
      const contacts: Contact[] = []
      let next: string | undefined

      try {
        do {
          const { data, headers } = yield clientService.httpAuthenticated.get(
            urlJoin(
              configStore.groupwareUrl,
              `accounts/${accountId}/addressbooks/${addressBookId}/contacts`
            ),
            { params: { limit: CONTACTS_PAGE_SIZE, ...(next && { next }) }, signal }
          )
          const page = parseContactsPage(data)
          contacts.push(...page.contacts)

          // the API also returns a next token after the last page
          const isComplete =
            !page.contacts.length || (page.total !== undefined && contacts.length >= page.total)
          next = isComplete ? undefined : headers?.next
        } while (next)

        setContacts(contacts)
        return contacts
      } catch (e) {
        console.error('Failed to load contacts:', e)
        setContacts([])
        error.value = e
        throw e
      }
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
