import { Resource } from '@opencloud-eu/web-client'
import { eventBus } from '../../services'
import { useInterceptShiftClick } from '../../composables/keyboardActions'

export function useToggleTile(data: [Resource, MouseEvent | KeyboardEvent], event?: MouseEvent) {
  const resource = data[0]
  const eventData = data[1]
  console.log('toggleTile called with', resource)

  if (event && useInterceptShiftClick(event as MouseEvent, resource)) {
    console.log('Action: 1')
    return
  }

  if (eventData && eventData.metaKey) {
    console.log('Action: 2')

    return eventBus.publish('app.files.list.clicked.meta', resource)
  }

  if (!eventData.shiftKey && !eventData.metaKey && !eventData.ctrlKey) {
    console.log('Action: 3, ohne return')
    eventBus.publish('app.files.shiftAnchor.reset')
  }

  if (eventData && eventData.shiftKey) {
    console.log('Action: 4')

    return eventBus.publish('app.files.list.clicked.shift', {
      resource,
      skipTargetSelection: false
    })
  }
  console.log('Action: 5 keine Action mit Return -> default action!?')

  eventBus.publish('app.files.list.clicked.default', resource)
}
