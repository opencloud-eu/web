import { useClientService } from '../clientService'
import { useAvatarsStore } from '../piniaStores'

export const useLoadAvatars = () => {
  const clientService = useClientService()
  const { addAvatar, getAvatar, avatarsQueue, pendingAvatarsRequests, abortControllers } =
    useAvatarsStore()

  const loadAvatar = async (userId: string, signal: AbortSignal) => {
    try {
      const avatar = await clientService.graphAuthenticated.photos.getUserPhoto(userId, {
        responseType: 'blob',
        signal
      })
      addAvatar(userId, URL.createObjectURL(avatar))
    } catch (error) {
      if (error.name === 'AbortError' || error.name === 'CanceledError') {
        return
      }
      if (error.response?.status === 404) {
        // If the avatar is not found, we can set it to null, otherwise it will be fetched again
        addAvatar(userId, null)
      }
    } finally {
      abortControllers.delete(userId)
    }

    return getAvatar(userId)
  }

  const enqueueAvatar = (userId: string) => {
    // Prevent duplicate requests for the same user
    if (getAvatar(userId) !== undefined || pendingAvatarsRequests.has(userId)) {
      return
    }

    const abortController = new AbortController()
    abortControllers.set(userId, abortController)

    const loadAvatarPromise = avatarsQueue.add(() => loadAvatar(userId, abortController.signal))
    pendingAvatarsRequests.set(userId, loadAvatarPromise)
    loadAvatarPromise.finally(() => pendingAvatarsRequests.delete(userId))
  }

  const cancelAvatar = (userId: string) => {
    const abortController = abortControllers.get(userId)
    if (abortController) {
      abortController.abort()
      abortControllers.delete(userId)
    }
    pendingAvatarsRequests.delete(userId)
  }

  return {
    enqueueAvatar,
    cancelAvatar
  }
}
