import { unref } from 'vue'
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

  const getContextMenuButtonEl = (item: Resource) => {
    return document.getElementById(`context-menu-trigger-${item.getDomSelector()}`)
  }

  const showContextMenuOnBtnClick = (data: ContextMenuBtnClickEventData, item: Resource) => {
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
    const contextButtonEl = getContextMenuButtonEl(item)
    if (contextButtonEl === undefined) {
      return
    }
    if (!isResourceSelected(item)) {
      emitSelect([item.id])
    }
    displayPositionedDropdown(dropdown.tippy, event, contextButtonEl)
  }

  const showContextMenuOnRightClick = (event: MouseEvent | KeyboardEvent, item: Resource) => {
    if (event instanceof MouseEvent && interceptModifierClick(event, item)) {
      return
    }
    event.preventDefault()
    if (isResourceDisabled(item)) {
      return false
    }

    const contextButtonEl = getContextMenuButtonEl(item)
    if (contextButtonEl === undefined) {
      return
    }
    if (!isResourceSelected(item)) {
      emitSelect([item.id])
    }

    if (unref(isMobile)) {
      // we can't use displayPositionedDropdown() on mobile because we need to open the bottom drawer.
      // this can be triggered by clicking the context menu button of the current row.
      contextButtonEl.click()
      return
    }

    displayPositionedDropdown((contextButtonEl as any)._tippy, event, contextButtonEl)
  }

  return {
    shouldShowContextDrop,
    showContextMenuOnBtnClick,
    showContextMenuOnRightClick
  }
}
