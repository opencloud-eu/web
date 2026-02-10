import { ref, onBeforeUnmount } from 'vue'

export const useSavedHint = (durationMs: number) => {
  const showSavedHint = ref(false)
  let timeout: ReturnType<typeof setTimeout> | undefined

  const clearSavedHint = () => {
    if (timeout) {
      clearTimeout(timeout)
      timeout = undefined
    }
    showSavedHint.value = false
  }

  const flashSavedHint = () => {
    showSavedHint.value = true

    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => {
      showSavedHint.value = false
    }, durationMs)
  }

  onBeforeUnmount(() => {
    clearSavedHint()
  })

  return {
    showSavedHint,
    flashSavedHint,
    clearSavedHint
  }
}
