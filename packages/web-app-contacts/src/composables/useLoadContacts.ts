import { computed, ref } from 'vue'
import { useTask } from 'vue-concurrency'
import { useClientService, useConfigStore, useMessages } from '@opencloud-eu/web-pkg'
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
      // contacts by id, pages might overlap
      const contacts = new Map<string, Contact>()
      const usedNextTokens = new Set<string>()
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
          const previousSize = contacts.size
          page.contacts.forEach((contact) => contacts.set(contact.id, contact))

          // the API also returns a next token after the last page, so stop at pages without new
          // contacts and at tokens that have been used already
          const isComplete =
            contacts.size === previousSize ||
            (page.total !== undefined && contacts.size >= page.total)
          next = isComplete ? undefined : headers?.next
          if (next && usedNextTokens.has(next)) {
            next = undefined
          }
          if (next) {
            usedNextTokens.add(next)
          }
        } while (next)
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
