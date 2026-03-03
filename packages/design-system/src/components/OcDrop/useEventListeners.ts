interface EventListenerEntry {
  target: Element | Document
  type: string
  handler: EventListener
  options?: AddEventListenerOptions | boolean
  category: 'anchor' | 'drop' | 'document'
}

export const useEventListeners = () => {
  const eventListeners: EventListenerEntry[] = []

  const registerEventListener = (
    target: Element | Document,
    type: string,
    handler: EventListener,
    category: EventListenerEntry['category'],
    options?: AddEventListenerOptions | boolean
  ) => {
    target.addEventListener(type, handler, options)
    eventListeners.push({ target, type, handler, options, category })
  }

  const unregisterEventListeners = (categories?: EventListenerEntry['category'][]) => {
    if (!categories) {
      eventListeners.forEach(({ target, type, handler, options }) => {
        target.removeEventListener(type, handler, options)
      })
      eventListeners.length = 0
      return
    }

    const toRemove = eventListeners.filter((l) => categories.includes(l.category))
    toRemove.forEach(({ target, type, handler, options }) => {
      target.removeEventListener(type, handler, options)
    })
    eventListeners.splice(
      0,
      eventListeners.length,
      ...eventListeners.filter((l) => !categories.includes(l.category))
    )
  }

  return { registerEventListener, unregisterEventListeners }
}
