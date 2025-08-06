import { Resource } from '@opencloud-eu/web-client'
import { useInterceptModifierClick } from '../../composables/keyboardActions'
import { useEventBus } from '../eventBus/useEventBus'

export function useToggleTile() {
  const { interceptModifierClick } = useInterceptModifierClick()
  const eventBus = useEventBus()

  const toggleTile = (data: [Resource, MouseEvent | KeyboardEvent], event?: MouseEvent) => {
    const resource = data[0]
    const eventData = data[1]

    if (event && interceptModifierClick(event as MouseEvent, resource)) {
      return
    }

    if (eventData && eventData.metaKey) {
      return eventBus.publish('app.files.list.clicked.meta', resource)
    }

    if (!eventData.shiftKey && !eventData.metaKey && !eventData.ctrlKey) {
      eventBus.publish('app.files.shiftAnchor.reset')
    }

    if (eventData && eventData.shiftKey) {
      return eventBus.publish('app.files.list.clicked.shift', {
        resource,
        skipTargetSelection: false
      })
    }

    eventBus.publish('app.files.list.clicked.default', resource)
  }
  return {
    toggleTile
  }
}
