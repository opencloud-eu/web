import { ref, watch, nextTick, type Ref } from 'vue'

export const useComposeDirtyTracking = <T extends object>(state: Ref<T>, onDirty: () => void) => {
  const isResetting = ref(false)

  watch(
    state,
    () => {
      if (isResetting.value) {
        return
      }
      onDirty()
    },
    { deep: true }
  )

  const runWithResetGuard = async (fn: () => void) => {
    isResetting.value = true
    fn()
    // Wait two ticks to ensure all watchers have processed the changes
    await nextTick()
    await nextTick()
    isResetting.value = false
  }

  return {
    isResetting,
    runWithResetGuard
  }
}
