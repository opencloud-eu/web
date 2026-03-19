import { onBeforeUnmount, type Ref, unref, onMounted } from 'vue'

export const useAutoSaveDraft = <T>({
  canAutoSaveNow,
  intervalMs,
  save,
  onSaved,
  onError
}: {
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

      if (!unref(canAutoSaveNow)) {
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

  onMounted(() => {
    start()
  })

  onBeforeUnmount(() => {
    stop()
  })

  return {
    start,
    stop
  }
}
