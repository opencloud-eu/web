import { Ref, onBeforeUnmount, ref, watch } from 'vue'

export const useIsVisible = ({
  target,
  mode = 'show',
  rootMargin = '100px',
  onVisibleCallback,
  onHiddenCallback
}: {
  target: Ref<Element>
  mode?: string
  rootMargin?: string
  onVisibleCallback?: () => void
  onHiddenCallback?: () => void
}) => {
  const isSupported = window && 'IntersectionObserver' in window
  if (!isSupported) {
    return {
      isVisible: ref(true)
    }
  }

  const isVisible = ref(false)
  let hasBeenVisible = false
  const observer = new IntersectionObserver(
    (intersectionObserverEntries: IntersectionObserverEntry[]) => {
      /**
       * In some edge cases intersectionObserverEntries contains 2 entries with the first one having wrong rootBounds.
       * This happens for some reason when the table is being re-sorted immediately after being rendered.
       * Therefore we always check the last entry for isIntersecting.
       */
      const isIntersecting = intersectionObserverEntries.at(-1).isIntersecting

      /**
       * In mode `show` the target stays visible once it has been visible.
       */
      if (mode === 'showHide' || !hasBeenVisible) {
        isVisible.value = isIntersecting
      }

      if (isIntersecting) {
        hasBeenVisible = true
        onVisibleCallback?.()
      } else if (hasBeenVisible) {
        onHiddenCallback?.()
      }

      /**
       * if given mode is `showHide` we need to keep the observation alive.
       * the same applies if the caller wants to be notified about targets leaving the viewport.
       */
      if (mode === 'showHide' || onHiddenCallback) {
        return
      }
      /**
       * if the mode is `show` which is the default, the implementation needs to unsubscribe the target from the observer
       */
      if (!isIntersecting) {
        return
      }

      observer.unobserve(target.value)
    },
    {
      rootMargin
    }
  )

  watch(target, () => {
    observer.observe(target.value)
  })

  onBeforeUnmount(() => observer.disconnect())

  return {
    isVisible
  }
}
