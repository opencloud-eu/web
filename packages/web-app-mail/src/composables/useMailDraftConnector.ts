import { useClientService, useConfigStore } from '@opencloud-eu/web-pkg'
import { urlJoin } from '@opencloud-eu/web-client'
import type { DraftEmailPayload, DraftEmailResponse, MailDraftApi } from './useSaveAsDraft'

export const useMailDraftConnector = (): MailDraftApi => {
  const configStore = useConfigStore()
  const clientService = useClientService()

  const http = clientService.httpAuthenticated
  const baseUrl = configStore.groupwareUrl

  return {
    async createDraft(accountId: string, payload: DraftEmailPayload) {
      const { data } = await http.post(
        urlJoin(baseUrl, 'accounts', encodeURIComponent(accountId), 'emails'),
        payload
      )
      return data as DraftEmailResponse
    },

    async replaceDraft(accountId: string, emailId: string, payload: DraftEmailPayload) {
      const { data } = await http.put(
        urlJoin(
          baseUrl,
          'accounts',
          encodeURIComponent(accountId),
          'emails',
          encodeURIComponent(emailId)
        ),
        payload
      )
      return data as DraftEmailResponse
    },

    async deleteDraft(accountId: string, emailId: string) {
      await http.delete(
        urlJoin(
          baseUrl,
          'accounts',
          encodeURIComponent(accountId),
          'emails',
          encodeURIComponent(emailId)
        )
      )
    }
  }
}
