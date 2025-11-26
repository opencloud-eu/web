import { computed } from 'vue'
import { useTask } from 'vue-concurrency'
import { useClientService, useConfigStore } from '@opencloud-eu/web-pkg'
import { useMailsStore } from './piniaStores/mails'
import { MailSchema } from '../types'
import { urlJoin } from '@opencloud-eu/web-client'

export const useLoadMail = () => {
  const configStore = useConfigStore()
  const clientService = useClientService()
  const { setCurrentMail, upsertMail } = useMailsStore()

  const loadMailTask = useTask(function* (signal, accountId: string, mailId: string) {
    try {
      const { data } = yield clientService.httpAuthenticated.get(
        urlJoin(configStore.groupwareUrl, `accounts/${accountId}/emails/${mailId}?markAsSeen=true`)
      )
      const mail = MailSchema.parse(data)
      upsertMail(mail)
      setCurrentMail(mail)
      console.info('Loaded mail:', mail)
      return mail
    } catch (e) {
      console.error('Failed to load mail:', e)
      throw e
    }
  }).restartable()

  const loadMail = async (accountId: string, mailId: string) => {
    return loadMailTask.perform(accountId, mailId)
  }

  const isLoading = computed(() => loadMailTask.isRunning)

  return {
    loadMail,
    loadMailTask,
    isLoading
  }
}
