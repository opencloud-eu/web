import { computed } from 'vue'
import { useTask } from 'vue-concurrency'
import { useClientService, useConfigStore } from '@opencloud-eu/web-pkg'
import { urlJoin } from '@opencloud-eu/web-client'
import { AttachmentBlobUploadResponse, AttachmentBlobUploadResponseSchema } from '../types'

export const useSaveAttachment = () => {
  const configStore = useConfigStore()
  const clientService = useClientService()

  const saveAttachmentTask = useTask(function* (signal, accountId: string, file: File) {
    const url = urlJoin(configStore.groupwareUrl, `accounts/${accountId}/blobs`)
    const headers: Record<string, string> = {}
    if (file.type) {
      headers['Content-Type'] = file.type
    }

    const { data } = yield clientService.httpAuthenticated.post(url, file, { headers, signal })
    return AttachmentBlobUploadResponseSchema.parse(data)
  }).restartable()

  const isLoading = computed(() => saveAttachmentTask.isRunning)

  const saveAttachment = async (
    accountId: string,
    file: File
  ): Promise<AttachmentBlobUploadResponse> => {
    const result = await saveAttachmentTask.perform(accountId, file)
    return result as AttachmentBlobUploadResponse
  }

  return {
    saveAttachment,
    saveAttachmentTask,
    isLoading
  }
}
