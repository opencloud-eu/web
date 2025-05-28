import PQueue from 'p-queue'
import { useClientService } from '../clientService'
import { useAvatarsStore, useConfigStore } from '../piniaStores'

export const useLoadAvatars = () => {
  const clientService = useClientService()
  const { addAvatar, getAvatar } = useAvatarsStore()
  const configStore = useConfigStore()

  const queue = new PQueue({ concurrency: configStore.options.concurrentRequests.avatars })

  const loadAvatar = async (userId: string) => {
    try {
      const avatar = await clientService.graphAuthenticated.photos.getUserPhoto(userId, {
        responseType: 'blob'
      })
      addAvatar(userId, URL.createObjectURL(avatar))
    } catch {
      addAvatar(userId, null)
    }

    return getAvatar(userId)
  }

  const enqueueAvatar = (userId: string) => {
    // Prevent duplicate requests for the same avatar
    if (getAvatar(userId) !== undefined) {
      return
    }

    return queue.add(() => loadAvatar(userId))
  }

  return {
    enqueueAvatar
  }
}
