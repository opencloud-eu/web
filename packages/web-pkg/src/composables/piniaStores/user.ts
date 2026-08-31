import { defineStore } from 'pinia'
import { ref } from 'vue'
import { User } from '@opencloud-eu/web-client/graph/generated'

export const useUserStore = defineStore('user', () => {
  const user = ref<User>()

  const setUser = (data: User) => {
    user.value = data
  }

  const reset = () => {
    user.value = null
  }

  return {
    user,
    setUser,
    reset
  }
})

export type UserStore = ReturnType<typeof useUserStore>
