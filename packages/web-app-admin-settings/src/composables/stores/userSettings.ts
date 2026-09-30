import { defineStore } from 'pinia'
import { ref, unref } from 'vue'
import { User } from '@opencloud-eu/web-client/graph/generated'

export const useUserSettingsStore = defineStore('userSettings', () => {
  const users = ref<User[]>([])
  const selectedUsers = ref<User[]>([])

  function setUsers(data: User[]) {
    users.value = data
  }

  function upsertUser(user: User) {
    const existing = unref(users).find(({ id }) => id === user.id)
    if (existing) {
      Object.assign(existing, user)
      return
    }
    users.value.push(user)
  }

  function removeUsers(values: User[]) {
    users.value = unref(users).filter((user) => !values.find(({ id }) => id === user.id))
  }

  function setSelectedUsers(data: User[]) {
    selectedUsers.value = data
  }

  function addSelectedUser(data: User) {
    selectedUsers.value.push(data)
  }

  function reset() {
    users.value = []
    selectedUsers.value = []
  }

  return {
    users,
    setUsers,
    upsertUser,
    removeUsers,
    reset,
    selectedUsers,
    addSelectedUser,
    setSelectedUsers
  }
})

export type UserSettingsStore = ReturnType<typeof useUserSettingsStore>
