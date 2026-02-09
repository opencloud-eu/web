import type {
  DraftEmailPayload,
  DraftEmailResponse,
  MailDraftApi
} from '../composables/useSaveAsDraft'

type HttpLike = {
  post: <T = unknown>(url: string, body: unknown) => Promise<{ data?: T } | T>
  put: <T = unknown>(url: string, body: unknown) => Promise<{ data?: T } | T>
  delete?: <T = unknown>(url: string) => Promise<{ data?: T } | T | void>
}

const unwrapData = <T>(res: any): T => {
  if (res && typeof res === 'object' && 'data' in res) {
    return res.data as T
  }
  return res as T
}

export function createMailDraftConnector(http: HttpLike, groupwareUrl: string): MailDraftApi {
  const base = (groupwareUrl ?? '').replace(/\/+$/, '')
  const emailsUrl = (accountId: string) => `${base}/accounts/${accountId}/emails`

  return {
    async createDraft(accountId: string, payload: DraftEmailPayload) {
      const res = await http.post<DraftEmailResponse>(emailsUrl(accountId), payload)
      return unwrapData<DraftEmailResponse>(res)
    },

    async replaceDraft(accountId: string, emailId: string, payload: DraftEmailPayload) {
      const res = await http.put<DraftEmailResponse>(`${emailsUrl(accountId)}/${emailId}`, payload)
      return unwrapData<DraftEmailResponse>(res)
    },

    async deleteDraft(accountId: string, emailId: string) {
      if (!http.delete) {
        return
      }
      await http.delete(`${emailsUrl(accountId)}/${emailId}`)
    }
  }
}
