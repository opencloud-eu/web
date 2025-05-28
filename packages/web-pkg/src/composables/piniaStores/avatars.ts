import { defineStore } from 'pinia'
import { markRaw, ref, unref } from 'vue'
import PQueue from 'p-queue'
import { useConfigStore } from './config'

export const useAvatarsStore = defineStore('avatars', () => {
  const configStore = useConfigStore()

  const avatarMap = ref<Record<string, string>>({})
  const avatarsQueue = markRaw(
    new PQueue({ concurrency: configStore.options.concurrentRequests.avatars })
  )
  const pendingAvatarsRequests = new Map<string, Promise<any>>()

  console.log(avatarsQueue)

  const addAvatar = (userId: string, avatar: string) => {
    avatarMap.value[userId] = avatar
  }

  const getAvatar = (userId: string) => {
    return unref(avatarMap)[userId]
  }

  const removeAvatar = (userId: string) => {
    avatarMap.value[userId] = null
  }

  const reset = () => {
    avatarMap.value = {}
  }

  return {
    avatarMap,
    getAvatar,
    addAvatar,
    removeAvatar,
    reset,
    avatarsQueue,
    pendingAvatarsRequests
  }
})

export type AvatarsStore = ReturnType<typeof useAvatarsStore>
