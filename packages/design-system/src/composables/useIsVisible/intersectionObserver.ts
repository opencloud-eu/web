type VisibilityCallback = (isIntersecting: boolean) => void

interface Observer {
  observe: (target: Element, callback: VisibilityCallback) => void
  unobserve: (target: Element, callback: VisibilityCallback) => void
}

/**
 * Holds one IntersectionObserver per set of observer options, grouped by root.
 * A list of 500 lazy items therefore costs one observer instead of 500.
 */
const observers = new Map<Element | null, Map<string, Observer>>()

function createObserver(root: Element | null, rootMargin: string): Observer {
  /** Weak so that a target whose `unobserve` never runs gets garbage collected. */
  const callbacks = new WeakMap<Element, Set<VisibilityCallback>>()
  /** Number of observed targets is tracked here because a WeakMap has no size. */
  let targetCount = 0

  const observer = new IntersectionObserver(
    (intersectionObserverEntries: IntersectionObserverEntry[]) => {
      /**
       * In some edge cases a target is reported twice with the first entry having wrong rootBounds.
       * This happens for some reason when the table is being re-sorted immediately after being rendered.
       * Therefore we only keep the last entry per target.
       */
      const latestEntries = new Map<Element, IntersectionObserverEntry>()
      for (const entry of intersectionObserverEntries) {
        latestEntries.set(entry.target, entry)
      }

      for (const [target, entry] of latestEntries) {
        for (const callback of callbacks.get(target) || []) {
          callback(entry.isIntersecting)
        }
      }
    },
    { root, rootMargin }
  )

  function observe(target: Element, callback: VisibilityCallback) {
    const targetCallbacks = callbacks.get(target)
    if (targetCallbacks) {
      targetCallbacks.add(callback)
      return
    }

    callbacks.set(target, new Set([callback]))
    targetCount++
    observer.observe(target)
  }

  function unobserve(target: Element, callback: VisibilityCallback) {
    const targetCallbacks = callbacks.get(target)
    if (!targetCallbacks?.delete(callback)) {
      return
    }

    // other consumers still observe the same target
    if (targetCallbacks.size) {
      return
    }

    callbacks.delete(target)
    targetCount--
    observer.unobserve(target)

    if (targetCount) {
      return
    }

    observer.disconnect()
    const rootObservers = observers.get(root)
    rootObservers?.delete(rootMargin)
    if (!rootObservers?.size) {
      observers.delete(root)
    }
  }

  return { observe, unobserve }
}

export function getObserver(root: Element | null, rootMargin: string): Observer {
  let rootObservers = observers.get(root)
  if (!rootObservers) {
    rootObservers = new Map<string, Observer>()
    observers.set(root, rootObservers)
  }

  const existingObserver = rootObservers.get(rootMargin)
  if (existingObserver) {
    return existingObserver
  }

  const observer = createObserver(root, rootMargin)
  rootObservers.set(rootMargin, observer)
  return observer
}
