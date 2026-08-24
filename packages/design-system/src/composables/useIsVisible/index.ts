import { Ref, onBeforeUnmount, ref, watch } from 'vue'

export const useIsVisible = ({
  target,
  root,
  mode = 'show',
  rootMargin = '100% 0%',
  onVisibleCallback,
  onHiddenCallback
}: {
  target: Ref<Element>
  /**
   * The scrollable element the look-ahead is measured against. Until it resolves,
   * the viewport is used, which gives no look-ahead inside a scroll container.
   */
  root: Ref<Element | null | undefined>
  /**
   * The mode determines whether the target should be observed for visibility
   * changes after it has been visible once.
   * @default 'show'
   */
  mode?: 'show' | 'showHide'
  /**
   * Percentages resolve against the root, so `100% 0%` gives a look-ahead of one
   * root height above and below without any horizontal buffer.
   */
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
  let observer: IntersectionObserver
  let observedRoot: Element | null

  const createObserver = (rootElement: Element | null) =>
    new IntersectionObserver(
      (
        intersectionObserverEntries: IntersectionObserverEntry[],
        intersectionObserver: IntersectionObserver
      ) => {
        /**
         * In some edge cases intersectionObserverEntries contains 2 entries with the first one having wrong rootBounds.
         * This happens for some reason when the table is being re-sorted immediately after being rendered.
         * Therefore we always check the last entry for isIntersecting.
         */
        const entry = intersectionObserverEntries.at(-1)
        const isIntersecting = entry.isIntersecting

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

        intersectionObserver.unobserve(entry.target)
      },
      {
        root: rootElement,
        rootMargin
      }
    )

  /**
   * The observer is created lazily, so it picks up the root and the target as soon
   * as both are available, and gets re-created whenever the root changes.
   */
  watch([target, root], ([targetElement, rootElement], [previousTargetElement]) => {
    if (observer && previousTargetElement) {
      observer.unobserve(previousTargetElement)
    }

    if (!targetElement) {
      return
    }

    if (!observer || rootElement !== observedRoot) {
      observer?.disconnect()
      observer = createObserver(rootElement ?? null)
      observedRoot = rootElement
    }

    observer.observe(targetElement)
  })

  onBeforeUnmount(() => observer?.disconnect())

  return {
    isVisible
  }
}
