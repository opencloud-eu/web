import { defineStore, storeToRefs } from 'pinia'
import { ref, unref } from 'vue'
import { useUserStore } from './user'

export const useAvatarsStore = defineStore('avatars', () => {
  const avatarMap = ref<Record<string, string>>({})
  const userAvatar = ref<string>()

  const userStore = useUserStore()
  const { user } = storeToRefs(userStore)

  const addAvatar = (userId: string, avatar: string) => {
    avatar[userId] = avatar
  }

  const getAvatar = (userId: string) => {
    return unref(avatarMap)[userId]
  }

  const removeAvatar = (userId: string) => {
    unref(avatarMap)[userId] = null
  }

  const setUserAvatar = (avatar: string) => {
    userAvatar.value = avatar
    avatarMap[unref(user).id] = avatar
  }

  const removeUserAvatar = () => {
    userAvatar.value = null
    avatarMap.value[unref(user).id] = null
  }

  const reset = () => {
    avatarMap.value = {}
    userAvatar.value = null
  }

  return {
    userAvatar,
    getAvatar,
    addAvatar,
    removeAvatar,
    setUserAvatar,
    removeUserAvatar,
    reset
  }
})

export type AvatarsStore = ReturnType<typeof useAvatarsStore>
