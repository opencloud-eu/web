import { computed } from 'vue'
import { useTask } from 'vue-concurrency'
import { useClientService, useConfigStore } from '@opencloud-eu/web-pkg'
import { urlJoin } from '@opencloud-eu/web-client'
import { z } from 'zod'
import { AttachmentBlobUploadResponse, AttachmentBlobUploadResponseSchema } from '../types'

let saveAttachmentTask: ReturnType<typeof useTask> | null = null
const isLoading = computed(() => saveAttachmentTask?.isRunning ?? false)

export const useSaveAttachment = () => {
  const configStore = useConfigStore()
  const clientService = useClientService()

  if (!saveAttachmentTask) {
    saveAttachmentTask = useTask(function* (signal, accountId: string, file: File) {
      const url = urlJoin(configStore.groupwareUrl, `accounts/${accountId}/blobs`)
      const headers: Record<string, string> = {}
      if (file.type) {
        headers['Content-Type'] = file.type
      }

      const { data } = yield clientService.httpAuthenticated.post(url, file, { headers, signal })
      return AttachmentBlobUploadResponseSchema.parse(data)
    }).restartable()
  }

  const saveAttachment = (accountId: string, file: File) => {
    return (saveAttachmentTask!.perform(accountId, file) as any).then(
      (value: AttachmentBlobUploadResponse) => value
    ) as Promise<AttachmentBlobUploadResponse>
  }

  return {
    saveAttachment,
    saveAttachmentTask,
    isLoading
  }
}
