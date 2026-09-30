import { onBeforeUnmount, onMounted, unref, Ref } from 'vue'
import { eventBus, KeyboardActions } from '@opencloud-eu/web-pkg'
import { findIndex, find } from 'lodash-es'
import { Item, Resource } from '@opencloud-eu/web-client'

export function useKeyboardTableMouseActions(
  keyActions: KeyboardActions,
  paginatedResources: Ref<Item[]>,
  selectedRows: Ref<Item[]>,
  lastSelectedRowIndex: Ref<number>,
  lastSelectedRowId: Ref<string | null>
) {
  let resourceListClickedMetaEvent: string
  let resourceListClickedShiftEvent: string

  function handleCtrlClickAction(resource: Resource) {
    const rowIndex = findIndex(unref(selectedRows), { id: resource.id })
    if (rowIndex >= 0) {
      selectedRows.value = unref(selectedRows).filter((item) => item.id != resource.id)
    } else {
      selectedRows.value.push(resource)
    }
    keyActions.resetSelectionCursor()

    lastSelectedRowIndex.value = rowIndex >= 0 ? rowIndex : unref(selectedRows).length - 1
    lastSelectedRowId.value = String(resource.id)
  }

  function handleShiftClickAction({
    resource,
    skipTargetSelection
  }: {
    resource: Item
    skipTargetSelection: boolean
  }) {
    const targetNode = document.querySelector(`[data-item-id='${resource.id}']`)
    const parent = targetNode?.closest('tr') || targetNode?.parentElement

    const resourceNodes = Object.values(parent.parentNode.children)
    const latestNode = resourceNodes.find(
      (r) => r.getAttribute('data-item-id') === unref(lastSelectedRowId)
    )
    const clickedNode = resourceNodes.find((r) => r.getAttribute('data-item-id') === resource.id)

    let latestNodeIndex = resourceNodes.indexOf(latestNode)
    latestNodeIndex = latestNodeIndex === -1 ? 0 : latestNodeIndex

    const clickedNodeIndex = resourceNodes.indexOf(clickedNode)
    const minIndex = Math.min(latestNodeIndex, clickedNodeIndex)
    const maxIndex = Math.max(latestNodeIndex, clickedNodeIndex)

    for (let i = minIndex; i <= maxIndex; i++) {
      const nodeId = resourceNodes[i].getAttribute('data-item-id')
      if (skipTargetSelection && nodeId === resource.id) {
        continue
      }
      const selectedRowIndex = findIndex(unref(selectedRows), { id: nodeId })
      if (selectedRowIndex === -1) {
        const selectedRow = find(unref(paginatedResources), { id: nodeId })
        selectedRows.value.push(selectedRow)
      }
    }

    lastSelectedRowIndex.value = findIndex(unref(paginatedResources), { id: resource.id })
    lastSelectedRowId.value = String(resource.id)
    keyActions.resetSelectionCursor()
  }

  onMounted(() => {
    resourceListClickedMetaEvent = eventBus.subscribe(
      'app.resources.list.clicked.meta',
      handleCtrlClickAction
    )
    resourceListClickedShiftEvent = eventBus.subscribe(
      'app.resources.list.clicked.shift',
      handleShiftClickAction
    )
  })

  onBeforeUnmount(() => {
    eventBus.unsubscribe('app.resources.list.clicked.meta', resourceListClickedMetaEvent)
    eventBus.unsubscribe('app.resources.list.clicked.shift', resourceListClickedShiftEvent)
  })
}
