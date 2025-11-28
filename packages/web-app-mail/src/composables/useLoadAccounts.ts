import { computed } from 'vue'
import { useTask } from 'vue-concurrency'
import { useClientService, useConfigStore } from '@opencloud-eu/web-pkg'
import { useAccountsStore } from './piniaStores/accounts'
import { MailAccountSchema } from '../types'
import { urlJoin } from '@opencloud-eu/web-client'
import { z } from 'zod'

let loadAccountsTask: ReturnType<typeof useTask> | null = null
const isLoading = computed(() => loadAccountsTask?.isRunning ?? false)

export const useLoadAccounts = () => {
  const configStore = useConfigStore()
  const clientService = useClientService()
  const { setAccounts } = useAccountsStore()

  if (!loadAccountsTask) {
    loadAccountsTask = useTask(function* (signal) {
      try {
        const { data } = yield clientService.httpAuthenticated.get(
          urlJoin(configStore.groupwareUrl, `accounts`)
        )
        const accounts = z.array(MailAccountSchema).parse(data)
        setAccounts(accounts)
        console.info('Loaded accounts:', accounts)
        return accounts
      } catch (e) {
        console.error('Failed to load accounts:', e)
        throw e
      }
    }).restartable()
  }

  const loadAccounts = () => {
    return loadAccountsTask!.perform()
  }

  return {
    loadAccounts,
    loadAccountsTask,
    isLoading
  }
}
