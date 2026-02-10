import { watch, onBeforeUnmount, toValue, type MaybeRefOrGetter } from 'vue'

export const useAutoSaveDraft = <T>(opts: {
  isOpen: MaybeRefOrGetter<boolean>
  canAutoSaveNow: MaybeRefOrGetter<boolean>
  intervalMs: number
  save: () => Promise<T | null | undefined>
  onSaved?: (result: T) => void
  onError?: (error: unknown) => void
}) => {
  let interval: ReturnType<typeof setInterval> | undefined

  const stop = () => {
    if (!interval) {
      return
    }
    clearInterval(interval)
    interval = undefined
  }

  const start = () => {
    stop()

    interval = setInterval(async () => {
      if (!toValue(opts.canAutoSaveNow)) {
        return
      }

      try {
        const res = await opts.save()
        if (res) {
          opts.onSaved?.(res)
        }
      } catch (error) {
        opts.onError?.(error)
      }
    }, opts.intervalMs)
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
