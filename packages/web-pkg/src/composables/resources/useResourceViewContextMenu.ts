import { ComponentPublicInstance, unref } from 'vue'
import { isProjectSpaceResource, Resource } from '@opencloud-eu/web-client'
import { ContextMenuBtnClickEventData, displayPositionedDropdown } from '../../helpers'
import { useIsMobile } from '@opencloud-eu/design-system/composables'
import { useInterceptModifierClick } from '../keyboardActions'
import { useEventBus } from '../eventBus'
import { useActiveLocation } from '../router'
import { isLocationTrashActive } from '../../router'

export const useResourceViewContextMenu = ({
  isResourceSelected,
  isResourceDisabled,
  emit
}: {
  isResourceSelected: (resource: Resource) => boolean
  isResourceDisabled: (resource: Resource) => boolean
  emit: (...args: any[]) => void
}) => {
  const eventBus = useEventBus()
  const { isMobile } = useIsMobile()
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
    data: ContextMenuBtnClickEventData,
    item: Resource,
    el: any
  ) => {
    const { dropdown, event } = data

    if (event instanceof MouseEvent && interceptModifierClick(event, item)) {
      return
    }

    if (isResourceDisabled(item)) {
      return false
    }

    if (dropdown?.tippy === undefined) {
      return
    }
    if (!isResourceSelected(item)) {
      emitSelect([item.id])
    }
    displayPositionedDropdown(dropdown.tippy, event, el)
  }

  const showContextMenuOnRightClick = (
    row: ComponentPublicInstance<unknown>,
    event: MouseEvent,
    item: Resource,
    el: any,
    className: string
  ) => {
    if (event instanceof MouseEvent && interceptModifierClick(event, item)) {
      return
    }
    event.preventDefault()
    if (isResourceDisabled(item)) {
      return false
    }

    const instance = row.$el.getElementsByClassName(className)[0]
    if (instance === undefined) {
      return
    }
    if (!isResourceSelected(item)) {
      emitSelect([item.id])
    }

    if (unref(isMobile)) {
      // we can't use displayPositionedDropdown() on mobile because we need to open the bottom drawer.
      // this can be triggered by clicking the context menu button of the current row.
      const el = document.getElementById(`context-menu-trigger-${item.getDomSelector()}`)
      el?.click()
      return
    }

    displayPositionedDropdown(instance._tippy, event, unref(el))
  }

  return {
    shouldShowContextDrop,
    showContextMenuOnBtnClick,
    showContextMenuOnRightClick
  }
}
