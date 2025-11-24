import { computed } from 'vue'
import { useTask } from 'vue-concurrency'
import { useClientService, useConfigStore } from '@opencloud-eu/web-pkg'
import { useMailboxesStore } from './piniaStores/mailboxes'
import { MailboxSchema } from '../types'
import { urlJoin } from '@opencloud-eu/web-client'
import { z } from 'zod'

export const useLoadMailboxes = () => {
  const configStore = useConfigStore()
  const clientService = useClientService()
  const mailboxesStore = useMailboxesStore()

  const loadMailboxesTask = useTask(function* (signal, accountId: string) {
    try {
      const { data } = yield clientService.httpAuthenticated.get(
        urlJoin(configStore.groupwareUrl, `accounts/${accountId}/mailboxes`)
      )
      const mailboxes = z.array(MailboxSchema).parse(data)
      mailboxesStore.setMailboxes(mailboxes)
      console.info('Loaded mailboxes:', mailboxes)
      return mailboxes
    } catch (e) {
      console.error('Failed to load mailboxes:', e)
      throw e
    }
  }).restartable()

  const loadMailboxes = async (accountId: string) => {
    return loadMailboxesTask.perform(accountId)
  }

  const isLoading = computed(() => loadMailboxesTask.isRunning)

  return {
    loadMailboxes,
    loadMailboxesTask,
    isLoading
  }
}
