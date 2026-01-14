import { eventBus } from '../../services'
import type { Resource } from '@opencloud-eu/web-client'

export function useInterceptModifierClick() {
  const interceptModifierClick = (
    event: MouseEvent | KeyboardEvent | undefined,
    resource: Resource
  ): boolean => {
    if (!event || !resource) {
      return false
    }

    const isShift = event.shiftKey
    const isCtrl = event.ctrlKey || event.metaKey

    if (!isShift && !isCtrl) {
      return false
    }

    event.stopPropagation?.()
    event.stopImmediatePropagation?.()

    if (isShift) {
      eventBus.publish('app.files.list.clicked.shift', {
        resource,
        skipTargetSelection: false
      })
    }

    if (isCtrl) {
      eventBus.publish('app.files.list.clicked.meta', resource)
    }

    return true
  }

  return {
    interceptModifierClick
  }
}
