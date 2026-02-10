import { watch, onBeforeUnmount, toValue, type MaybeRefOrGetter } from 'vue'

export const useAutoSaveDraft = <T>(opts: {
  isOpen: MaybeRefOrGetter<boolean>
  canAutoSaveNow: MaybeRefOrGetter<boolean>
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

      if (!toValue(opts.canAutoSaveNow)) {
        scheduleNext()
        return
      }

      try {
        const res = await opts.save()
        if (res) {
          opts.onSaved?.(res)
        }
      } catch (error) {
        opts.onError?.(error)
      } finally {
        scheduleNext()
      }
    }, opts.intervalMs)
  }

  const start = () => {
    if (isRunning) {
      return
    }
    isRunning = true
    scheduleNext()
  }

  watch(
    () => toValue(opts.isOpen),
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
