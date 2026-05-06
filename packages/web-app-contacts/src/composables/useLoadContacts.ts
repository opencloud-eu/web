import { computed } from 'vue'
import { useTask } from 'vue-concurrency'
import { useClientService, useConfigStore } from '@opencloud-eu/web-pkg'
import { useContactsStore } from './piniaStores/contacts'
import { parseContactsResponse } from '../types'
import { urlJoin } from '@opencloud-eu/web-client'

let loadContactsTask: ReturnType<typeof useTask> | null = null
const isLoading = computed(() => loadContactsTask?.isRunning ?? false)

export const useLoadContacts = () => {
  const configStore = useConfigStore()
  const clientService = useClientService()
  const { setContacts } = useContactsStore()

  if (!loadContactsTask) {
    loadContactsTask = useTask(function* (signal, accountId: string, addressBookId: string) {
      try {
        const { data } = yield clientService.httpAuthenticated.get(
          urlJoin(
            configStore.groupwareUrl,
            `accounts/${accountId}/addressbooks/${addressBookId}/contacts`
          )
        )
        const contacts = parseContactsResponse(data)
        setContacts(contacts)
        console.info('Loaded contacts:', contacts)
        return contacts
      } catch (e) {
        console.error('Failed to load contacts:', e)
        throw e
      }
    }).restartable()
  }

  const loadContacts = (accountId: string, addressBookId: string) => {
    return loadContactsTask!.perform(accountId, addressBookId)
  }

  return {
    loadContacts,
    loadContactsTask,
    isLoading
  }
}
