import { computed, ref } from 'vue'
import { useTask } from 'vue-concurrency'
import { useClientService, useConfigStore } from '@opencloud-eu/web-pkg'
import { useAddressBooksStore } from './piniaStores/addressbooks'
import { parseAddressBooksResponse } from '../types'
import { urlJoin } from '@opencloud-eu/web-client'

let loadAddressBooksTask: ReturnType<typeof useTask> | null = null
const isLoading = computed(() => loadAddressBooksTask?.isRunning ?? false)
const error = ref<Error>()

export const useLoadAddressBooks = () => {
  const configStore = useConfigStore()
  const clientService = useClientService()
  const { setAddressBooks } = useAddressBooksStore()

  if (!loadAddressBooksTask) {
    loadAddressBooksTask = useTask(function* (signal, accountId: string) {
      error.value = undefined

      try {
        const { data } = yield clientService.httpAuthenticated.get(
          urlJoin(configStore.groupwareUrl, `accounts/${accountId}/addressbooks`),
          { signal }
        )
        const addressbooks = parseAddressBooksResponse(data)
        setAddressBooks(addressbooks)
        return addressbooks
      } catch (e) {
        console.error('Failed to load address books:', e)
        error.value = e
        throw e
      }
    }).restartable()
  }

  const loadAddressBooks = (accountId: string) => {
    return loadAddressBooksTask!.perform(accountId)
  }

  return {
    loadAddressBooks,
    loadAddressBooksTask,
    isLoading,
    error
  }
}
