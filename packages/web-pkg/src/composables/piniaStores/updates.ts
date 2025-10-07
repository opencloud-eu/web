import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Updates } from '../../types'

export const useUpdatesStore = defineStore('updates', () => {
  const isLoading = ref<boolean>(true)
  const hasError = ref<boolean>(false)
  const updates = ref<Updates>()

  const setIsLoading = (value: boolean) => {
    isLoading.value = value
  }
  const setHasError = (value: boolean) => {
    hasError.value = value
  }
  const setUpdates = (data: Updates) => {
    updates.value = data
  }

  return {
    updates,
    isLoading,
    hasError,
    setUpdates,
    setHasError,
    setIsLoading
  }
})

export type UpdatesStore = ReturnType<typeof useUpdatesStore>
