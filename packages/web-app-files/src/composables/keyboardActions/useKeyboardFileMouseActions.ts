import { onBeforeUnmount, onMounted, unref, Ref, watchEffect } from 'vue'
import { QueryValue, FolderViewModeConstants, useResourcesStore } from '@opencloud-eu/web-pkg'
import { eventBus } from '@opencloud-eu/web-pkg'
import { KeyboardActions } from '@opencloud-eu/web-pkg'
import { Resource } from '@opencloud-eu/web-client'
import { findIndex } from 'lodash-es'
import { storeToRefs } from 'pinia'

export const useKeyboardFileMouseActions = (
  keyActions: KeyboardActions,
  viewMode: Ref<string | QueryValue>
) => {
  const resourcesStore = useResourcesStore()
  const { latestSelectedId } = storeToRefs(resourcesStore)

  let fileListClickedEvent: string
  let shiftAnchorResetEvent: string
  let fileListClickedMetaEvent: string
  let fileListClickedShiftEvent: string
  let shiftSelectionAnchorId: string | null = null

  const handleCtrlClickAction = (resource: Resource) => {
    resourcesStore.toggleSelection(resource.id)
  }

  const handleShiftClickAction = ({
    resource,
    skipTargetSelection
  }: {
    resource: Resource
    skipTargetSelection: boolean
  }) => {
    if (!shiftSelectionAnchorId) {
      shiftSelectionAnchorId = unref(latestSelectedId)
    }
    resourcesStore.setSelection([])

    const parent = document.querySelectorAll(`[data-item-id='${resource.id}']`)[0]
    const resourceNodes = Object.values(parent.parentNode.children)
    const anchorNode = resourceNodes.find(
      (r) => r.getAttribute('data-item-id') === shiftSelectionAnchorId
    )
    const clickedNode = resourceNodes.find((r) => r.getAttribute('data-item-id') === resource.id)

    let anchorIndex = resourceNodes.indexOf(anchorNode)
    anchorIndex = anchorIndex === -1 ? 0 : anchorIndex

    const clickedIndex = resourceNodes.indexOf(clickedNode)
    const minIndex = Math.min(anchorIndex, clickedIndex)
    const maxIndex = Math.max(anchorIndex, clickedIndex)

    for (let i = minIndex; i <= maxIndex; i++) {
      const nodeId = resourceNodes[i].getAttribute('data-item-id')
      const isDisabled = resourceNodes[i].classList.contains('oc-table-disabled')
      if ((skipTargetSelection && nodeId === resource.id) || isDisabled) {
        continue
      }
      resourcesStore.addSelection(nodeId)
    }

    resourcesStore.setLastSelectedId(resource.id)
  }

  const handleTilesShiftClickAction = ({
    resource,
    skipTargetSelection
  }: {
    resource: Resource
    skipTargetSelection: boolean
  }) => {
    if (!shiftSelectionAnchorId) {
      shiftSelectionAnchorId = unref(latestSelectedId)
    }
    resourcesStore.setSelection([])

    const tilesListCard = document.querySelectorAll('#tiles-view > ul > li > div')
    const startIndex = findIndex(
      tilesListCard,
      (r: { getAttribute: (arg0: string) => string }) =>
        r.getAttribute('data-item-id') === resource.id
    )
    const endIndex = findIndex(
      tilesListCard,
      (r: { getAttribute: (arg0: string) => string }) =>
        r.getAttribute('data-item-id') === shiftSelectionAnchorId
    )
    const minIndex = Math.min(endIndex, startIndex)
    const maxIndex = Math.max(endIndex, startIndex)

    for (let i = minIndex; i <= maxIndex; i++) {
      const nodeId = tilesListCard[i].getAttribute('data-item-id')
      const isDisabled = tilesListCard[i].classList.contains('oc-tile-card-disabled')

      if ((skipTargetSelection && nodeId === resource.id) || isDisabled) {
        continue
      }
      resourcesStore.addSelection(nodeId)
    }
    resourcesStore.setLastSelectedId(resource.id)
  }

  onMounted(() => {
    fileListClickedEvent = eventBus.subscribe(
      'app.files.list.clicked',
      keyActions.resetSelectionCursor
    )
    shiftAnchorResetEvent = eventBus.subscribe('app.files.shiftAnchor.reset', () => {
      shiftSelectionAnchorId = null
    })
    fileListClickedMetaEvent = eventBus.subscribe(
      'app.files.list.clicked.meta',
      handleCtrlClickAction
    )
  })

  onBeforeUnmount(() => {
    eventBus.unsubscribe('app.files.shiftAnchor.reset', shiftAnchorResetEvent)
    eventBus.unsubscribe('app.files.list.clicked', fileListClickedEvent)
    eventBus.unsubscribe('app.files.list.clicked.meta', fileListClickedMetaEvent)
    eventBus.unsubscribe('app.files.list.clicked.shift', fileListClickedShiftEvent)
  })
  watchEffect(() => {
    eventBus.unsubscribe('app.files.list.clicked.shift', fileListClickedShiftEvent)
    fileListClickedShiftEvent = eventBus.subscribe(
      'app.files.list.clicked.shift',
      FolderViewModeConstants.name.tiles === viewMode.value
        ? handleTilesShiftClickAction
        : handleShiftClickAction
    )
  })
}
