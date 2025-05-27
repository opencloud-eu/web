import { defineStore } from 'pinia'
import { ref, unref } from 'vue'

export const useAvatarsStore = defineStore('avatars', () => {
  const avatarMap = ref<Record<string, string>>({})

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
    reset
  }
})

export type AvatarsStore = ReturnType<typeof useAvatarsStore>
