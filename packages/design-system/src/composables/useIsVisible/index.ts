import { Ref, onBeforeUnmount, ref, watch } from 'vue'
import { getObserver } from './intersectionObserver'

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
      isVisible: ref(true),
      unobserve: (): void => undefined
    }
  }

  const isVisible = ref(false)
  let hasBeenVisible = false
  let observedTarget: Element = null
  let observer: ReturnType<typeof getObserver> = null

  function unobserve() {
    if (!observedTarget) {
      return
    }
    observer.unobserve(observedTarget, onIntersect)
    observedTarget = null
    observer = null
  }

  function onIntersect(isIntersecting: boolean) {
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

    unobserve()
  }

  /**
   * The observation starts lazily, so it picks up the root and the target as soon
   * as both are available, and moves to another observer whenever the root changes.
   */
  watch([target, root], ([targetElement, rootElement]) => {
    unobserve()
    if (!targetElement) {
      return
    }

    observedTarget = targetElement
    observer = getObserver(rootElement ?? null, rootMargin)
    observer.observe(targetElement, onIntersect)
  })

  onBeforeUnmount(unobserve)

  return {
    isVisible,
    unobserve
  }
}
