import { computed, ref } from 'vue'
import { useTask } from 'vue-concurrency'
import { urlJoin } from '@opencloud-eu/web-client'
import { useClientService, useConfigStore } from '@opencloud-eu/web-pkg'
import { requestContactPages } from './useLoadContacts'
import type { Contact } from '../types'

let loadAllContactsTask: ReturnType<typeof useTask> | null = null
const isLoading = computed(() => loadAllContactsTask?.isRunning ?? false)
const allContacts = ref<Contact[]>([])
// the account the contacts were loaded for, unset while loading or after a failure
const loadedAccountId = ref<string>()
const error = ref<Error>()

/**
 * Loads the contacts of all address books of an account, used to search across address books.
 */
export const useLoadAllContacts = () => {
  const configStore = useConfigStore()
  const clientService = useClientService()

  if (!loadAllContactsTask) {
    loadAllContactsTask = useTask(function* (signal, accountId: string) {
      loadedAccountId.value = undefined
      error.value = undefined

      try {
        allContacts.value = yield* requestContactPages(
          clientService,
          urlJoin(configStore.groupwareUrl, `accounts/${accountId}/contacts`),
          signal
        )
        loadedAccountId.value = accountId
      } catch (e) {
        console.error('Failed to load contacts of all address books:', e)
        allContacts.value = []
        error.value = e
      }
    }).restartable()
  }

  const loadAllContacts = (accountId: string) => {
    return loadAllContactsTask!.perform(accountId)
  }

  return {
    allContacts,
    loadedAccountId,
    loadAllContacts,
    isLoading,
    error
  }
}
