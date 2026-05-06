import { computed } from 'vue'
import { useTask } from 'vue-concurrency'
import { useClientService, useConfigStore } from '@opencloud-eu/web-pkg'
import { useAddressBooksStore } from './piniaStores/addressbooks'
import { parseAddressBooksResponse } from '../types'
import { urlJoin } from '@opencloud-eu/web-client'

let loadAddressBooksTask: ReturnType<typeof useTask> | null = null
const isLoading = computed(() => loadAddressBooksTask?.isRunning ?? false)

export const useLoadAddressBooks = () => {
  const configStore = useConfigStore()
  const clientService = useClientService()
  const { setAddressBooks } = useAddressBooksStore()

  if (!loadAddressBooksTask) {
    loadAddressBooksTask = useTask(function* (signal, accountId: string) {
      try {
        const { data } = yield clientService.httpAuthenticated.get(
          urlJoin(configStore.groupwareUrl, `accounts/${accountId}/addressbooks`)
        )
        const addressbooks = parseAddressBooksResponse(data)
        setAddressBooks(addressbooks)
        console.info('Loaded addressbooks:', addressbooks)
        return addressbooks
      } catch (e) {
        console.error('Failed to load addressBooks:', e)
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
    isLoading
  }
}
