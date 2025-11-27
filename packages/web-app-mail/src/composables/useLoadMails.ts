import { computed } from 'vue'
import { useTask } from 'vue-concurrency'
import { useClientService, useConfigStore } from '@opencloud-eu/web-pkg'
import { useMailsStore } from './piniaStores/mails'
import { MailSchema } from '../types'
import { urlJoin } from '@opencloud-eu/web-client'
import { z } from 'zod'

let loadMailsTask: ReturnType<typeof useTask> | null = null
const isLoading = computed(() => loadMailsTask?.isRunning ?? false)

export const useLoadMails = () => {
  const configStore = useConfigStore()
  const clientService = useClientService()
  const { setMails } = useMailsStore()

  if (!loadMailsTask) {
    loadMailsTask = useTask(function* (signal, accountId: string, mailboxId: string) {
      try {
        const { data } = yield clientService.httpAuthenticated.get(
          urlJoin(configStore.groupwareUrl, `accounts/${accountId}/mailboxes/${mailboxId}/emails`)
        )
        const mails = z.array(MailSchema).parse(data.emails || [])
        setMails(mails)
        console.info('Loaded mails:', mails)
        return mails
      } catch (e) {
        console.error('Failed to load mails:', e)
        throw e
      }
    }).restartable()
  }

  const loadMails = async (accountId: string, mailboxId: string) => {
    return loadMailsTask!.perform(accountId, mailboxId)
  }

  return {
    loadMails,
    loadMailsTask,
    isLoading
  }
}
