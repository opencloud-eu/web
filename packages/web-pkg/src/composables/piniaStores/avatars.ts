import { defineStore, storeToRefs } from 'pinia'
import { ref, unref } from 'vue'
import { useUserStore } from './user'

export type Avatar = string
export type AvatarMap = Record<string, Avatar>

export const useAvatarsStore = defineStore('avatars', () => {
  const avatarMap = ref<AvatarMap>({})
  const userAvatar = ref<Avatar>()

  const userStore = useUserStore()
  const { user } = storeToRefs(userStore)

  const addAvatar = (userId: string, avatar: Avatar) => {
    avatar[userId] = avatar
  }

  const getAvatar = (userId: string) => {
    return unref(avatarMap)[userId]
  }

  const removeAvatar = (userId: string) => {
    unref(avatarMap)[userId] = null
  }

  const setUserAvatar = (avatar: Avatar) => {
    userAvatar.value = avatar
    avatarMap[unref(user).id] = avatar
  }

  const removeUserAvatar = () => {
    userAvatar.value = null
    unref(avatarMap)[unref(user).id] = null
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
