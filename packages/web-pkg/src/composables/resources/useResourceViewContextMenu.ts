import { ComponentPublicInstance, unref } from 'vue'
import { isProjectSpaceResource, Resource } from '@opencloud-eu/web-client'
import { useInterceptModifierClick } from '../keyboardActions'
import { useEventBus } from '../eventBus'
import { useActiveLocation } from '../router'
import { isLocationTrashActive } from '../../router'
import { OcDrop } from '@opencloud-eu/design-system/components'

export const useResourceViewContextMenu = ({
  isResourceSelected,
  isResourceDisabled,
  emit
}: {
  isResourceSelected: (resource: Resource) => boolean
  isResourceDisabled: (resource: Resource) => boolean
  emit: ReturnType<typeof defineEmits>
}) => {
  const eventBus = useEventBus()
  const { interceptModifierClick } = useInterceptModifierClick()

  const emitSelect = (selectedIds: string[]) => {
    eventBus.publish('app.files.list.clicked')
    emit('update:selectedIds', selectedIds)
  }

  const isTrashOverviewRoute = useActiveLocation(isLocationTrashActive, 'files-trash-overview')

  const shouldShowContextDrop = (item: Resource) => {
    if (unref(isTrashOverviewRoute) && isProjectSpaceResource(item) && item.disabled) {
      return false
    }

    return !isResourceDisabled(item)
  }

  const showContextMenuOnBtnClick = (
    event: MouseEvent | KeyboardEvent,
    item: Resource,
    drop: ComponentPublicInstance<typeof OcDrop>
  ) => {
    if (event instanceof MouseEvent && interceptModifierClick(event, item)) {
      return
    }

    if (isResourceDisabled(item)) {
      return
    }

    drop?.show({ event })
  }

  const showContextMenuOnRightClick = (
    event: MouseEvent | KeyboardEvent,
    item: Resource,
    drop: ComponentPublicInstance<typeof OcDrop>
  ) => {
    if (event instanceof MouseEvent && interceptModifierClick(event, item)) {
      return
    }
    event.preventDefault()
    if (isResourceDisabled(item)) {
      return
    }

    if (!isResourceSelected(item)) {
      emitSelect([item.id])
    }

    drop?.show({ event, useMouseAnchor: true })
  }

  return {
    shouldShowContextDrop,
    showContextMenuOnBtnClick,
    showContextMenuOnRightClick
  }
}
