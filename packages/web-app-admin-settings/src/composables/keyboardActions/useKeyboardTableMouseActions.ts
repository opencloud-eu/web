import { onBeforeUnmount, onMounted, unref, Ref } from 'vue'
import { eventBus, KeyboardActions } from '@opencloud-eu/web-pkg'
import { findIndex } from 'lodash-es'
import { Item, Resource } from '@opencloud-eu/web-client'

export function useKeyboardTableMouseActions(
  keyActions: KeyboardActions,
  paginatedResources: Ref<Item[]>,
  selectedRows: Ref<Item[]>,
  lastSelectedRowId: Ref<string | null>
) {
  let resourceListClickedMetaEvent: string
  let resourceListClickedShiftEvent: string
  let shiftSelectionAnchorId: string | null = null

  // makes the item the start of the next shift-click or shift + arrow range
  function setSelectionStart(item: Item) {
    lastSelectedRowId.value = String(item.id)
    keyActions.resetSelectionCursor()
    shiftSelectionAnchorId = null
  }

  function handleCtrlClickAction(resource: Resource) {
    const rowIndex = findIndex(unref(selectedRows), { id: resource.id })
    if (rowIndex >= 0) {
      selectedRows.value = unref(selectedRows).filter((item) => item.id != resource.id)
    } else {
      selectedRows.value.push(resource)
    }
    setSelectionStart(resource)
  }

  function getShiftSelectionAnchorId(resource: Item) {
    const selectedIds = unref(selectedRows).map(({ id }) => id)
    if (shiftSelectionAnchorId && selectedIds.includes(shiftSelectionAnchorId)) {
      return shiftSelectionAnchorId
    }
    const latestId = unref(lastSelectedRowId)
    if (selectedIds.includes(latestId)) {
      return latestId
    }
    // unknown latest row, the range starts at the first row
    if (!latestId && selectedIds.length) {
      return null
    }
    return resource.id
  }

  function handleShiftClickAction({ resource }: { resource: Item }) {
    const resources = unref(paginatedResources)
    const clickedIndex = resources.findIndex(({ id }) => id === resource.id)
    if (clickedIndex === -1) {
      return
    }

    const anchorId = getShiftSelectionAnchorId(resource)
    // anchor may be unknown or on another page
    const anchorIndex = Math.max(
      resources.findIndex(({ id }) => id === anchorId),
      0
    )
    const minIndex = Math.min(anchorIndex, clickedIndex)
    const maxIndex = Math.max(anchorIndex, clickedIndex)
    selectedRows.value = resources.slice(minIndex, maxIndex + 1)
    shiftSelectionAnchorId = resources[anchorIndex].id

    lastSelectedRowId.value = String(resource.id)
    keyActions.selectionCursor.value = clickedIndex - anchorIndex
  }

  onMounted(() => {
    resourceListClickedMetaEvent = eventBus.subscribe(
      'app.admin-settings.list.clicked.meta',
      handleCtrlClickAction
    )
    resourceListClickedShiftEvent = eventBus.subscribe(
      'app.admin-settings.list.clicked.shift',
      handleShiftClickAction
    )
  })

  onBeforeUnmount(() => {
    eventBus.unsubscribe('app.admin-settings.list.clicked.meta', resourceListClickedMetaEvent)
    eventBus.unsubscribe('app.admin-settings.list.clicked.shift', resourceListClickedShiftEvent)
  })

  return { setSelectionStart }
}
