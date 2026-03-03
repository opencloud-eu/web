import { watch, onBeforeUnmount, toValue, type Ref } from 'vue'

export const useAutoSaveDraft = <T>( {
  isOpen,
  canAutoSaveNow,
  intervalMs,
  save,
  onSaved,
  onError
}: {
  isOpen: Ref<boolean>
  canAutoSaveNow: Ref<boolean>
  intervalMs: number
  save: () => Promise<T | null | undefined>
  onSaved?: (result: T) => void
  onError?: (error: unknown) => void
}) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let isRunning = false

  const stop = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = undefined
    }
    isRunning = false
  }

  const scheduleNext = () => {
    if (!isRunning) {
      return
    }

    timeoutId = setTimeout(async () => {
      if (!isRunning) {
        return
      }

      if (!toValue(canAutoSaveNow)) {
        scheduleNext()
        return
      }

      try {
        const res = await save()
        if (res) {
          onSaved?.(res)
        }
      } catch (error) {
        onError?.(error)
      } finally {
        scheduleNext()
      }
    }, intervalMs)
  }

  const start = () => {
    if (isRunning) {
      return
    }
    isRunning = true
    scheduleNext()
  }

  watch(
    () => toValue(isOpen),
    (open) => {
      if (open) {
        start()
      } else {
        stop()
      }
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    stop()
  })

  return {
    start,
    stop
  }
}
