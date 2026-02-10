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

const buildPath = (...segments: string[]): string => {
  return segments.map((segment) => encodeURIComponent(segment)).join('/')
}

export function createMailDraftConnector(http: HttpLike, groupwareUrl: string): MailDraftApi {
  const base = (groupwareUrl ?? '').replace(/\/+$/, '')

  return {
    async createDraft(accountId: string, payload: DraftEmailPayload) {
      const url = `${base}/accounts/${buildPath(accountId)}/emails`
      const res = await http.post<DraftEmailResponse>(url, payload)
      return unwrapData<DraftEmailResponse>(res)
    },

    async replaceDraft(accountId: string, emailId: string, payload: DraftEmailPayload) {
      const url = `${base}/accounts/${buildPath(accountId)}/emails/${buildPath(emailId)}`
      const res = await http.put<DraftEmailResponse>(url, payload)
      return unwrapData<DraftEmailResponse>(res)
    },

    async deleteDraft(accountId: string, emailId: string) {
      if (!http.delete) {
        return
      }
      const url = `${base}/accounts/${buildPath(accountId)}/emails/${buildPath(emailId)}`
      await http.delete(url)
    }
  }
}
