import { computed } from 'vue'
import { useTask } from 'vue-concurrency'
import { useClientService, useConfigStore } from '@opencloud-eu/web-pkg'
import { useAccountsStore } from './piniaStores/accounts'
import { MailAccountSchema } from '../types'
import { urlJoin } from '@opencloud-eu/web-client'
import { z } from 'zod'

export const useLoadAccounts = () => {
  const configStore = useConfigStore()
  const clientService = useClientService()
  const accountsStore = useAccountsStore()

  const loadAccountsTask = useTask(function* (signal) {
    try {
      const { data } = yield clientService.httpAuthenticated.get(
        urlJoin(configStore.groupwareUrl, `accounts`)
      )
      const accounts = z.array(MailAccountSchema).parse(data)
      accountsStore.setAccounts(accounts)
      console.info('Loaded accounts:', accounts)
      return accounts
    } catch (e) {
      console.error('Failed to load accounts:', e)
      throw e
    }
  }).restartable()

  const loadAccounts = async () => {
    return loadAccountsTask.perform()
  }

  const isLoading = computed(() => loadAccountsTask.isRunning)

  return {
    loadAccounts,
    loadAccountsTask,
    isLoading
  }
}
