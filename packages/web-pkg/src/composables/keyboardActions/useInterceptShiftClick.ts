import { eventBus } from '../../services'
import type { Resource } from '@opencloud-eu/web-client'

export function useInterceptShiftClick(event: MouseEvent, resource: Resource): boolean {
  if (!event?.shiftKey) {
    return false
  }

  event.stopPropagation?.()
  event.stopImmediatePropagation?.()

  eventBus.publish('app.files.list.clicked.shift', {
    resource,
    skipTargetSelection: false
  })

  return true
}
