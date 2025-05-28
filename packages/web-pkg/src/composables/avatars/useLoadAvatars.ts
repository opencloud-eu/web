import { useClientService } from '../clientService'
import { useAvatarsStore } from '../piniaStores'

export const useLoadAvatars = () => {
  const clientService = useClientService()
  const { addAvatar, getAvatar, avatarsQueue, pendingAvatarsRequests } = useAvatarsStore()

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
    // Prevent duplicate requests for the same user
    if (getAvatar(userId) !== undefined || pendingAvatarsRequests.has(userId)) {
      return
    }

    const loadAvatarPromise = avatarsQueue.add(() => loadAvatar(userId))
    pendingAvatarsRequests.set(userId, loadAvatarPromise)
    loadAvatarPromise.finally(() => pendingAvatarsRequests.delete(userId))
  }

  return {
    enqueueAvatar
  }
}
