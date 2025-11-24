import { computed } from 'vue'
import { useTask } from 'vue-concurrency'
import { useClientService, useConfigStore } from '@opencloud-eu/web-pkg'
import { useMailsStore } from './piniaStores/mails'
import { MailSchema } from '../types'
import { urlJoin } from '@opencloud-eu/web-client'
import { z } from 'zod'

export const useLoadMails = () => {
  const configStore = useConfigStore()
  const clientService = useClientService()
  const mailsStore = useMailsStore()

  const loadMailsTask = useTask(function* (signal, accountId: string, mailboxId: string) {
    try {
      const { data } = yield clientService.httpAuthenticated.get(
        urlJoin(configStore.groupwareUrl, `accounts/${accountId}/mailboxes/${mailboxId}/emails`)
      )
      const mails = z.array(MailSchema).parse(data.emails || [])
      mailsStore.setMails(mails)
      console.info('Loaded mails:', mails)
      return mails
    } catch (e) {
      console.error('Failed to load mails:', e)
      throw e
    }
  }).restartable()

  const loadMails = async (accountId: string, mailboxId: string) => {
    return loadMailsTask.perform(accountId, mailboxId)
  }

  const isLoading = computed(() => loadMailsTask.isRunning)

  return {
    loadMails,
    loadMailsTask,
    isLoading
  }
}
