import { useScrollTo } from '@opencloud-eu/web-pkg'
import { Ref, unref } from 'vue'
import { Key, KeyboardActions, Modifier, focusCheckbox } from '@opencloud-eu/web-pkg'
import { Item } from '@opencloud-eu/web-client'

export function useKeyboardTableNavigation(
  keyActions: KeyboardActions,
  paginatedResources: Ref<Item[]>,
  selectedRows: Ref<Item[]>,
  lastSelectedRowIndex: Ref<number>,
  lastSelectedRowId: Ref<string | null>
) {
  const { scrollToResource } = useScrollTo()

  function getResourceIndex(id: string) {
    return unref(paginatedResources).findIndex((resource) => resource.id === id)
  }

  function getNextResource(previous = false) {
    const lastIndex = getResourceIndex(unref(lastSelectedRowId))
    if (lastIndex === -1) {
      return undefined
    }
    return unref(paginatedResources)[lastIndex + (previous ? -1 : 1)]
  }

  function toggleLastSelectedRow() {
    const lastSelectedRow = unref(paginatedResources).find(
      (resource) => resource.id === unref(lastSelectedRowId)
    )
    const isSelected = unref(selectedRows).some((row) => row.id === unref(lastSelectedRowId))

    if (!isSelected) {
      selectedRows.value.push(lastSelectedRow)
      return
    }
    selectedRows.value = unref(selectedRows).filter((row) => row.id !== lastSelectedRow.id)
  }

  function moveCursorTo(resource: Item) {
    focusCheckbox(resource.id)
    lastSelectedRowIndex.value = getResourceIndex(resource.id)
    lastSelectedRowId.value = String(resource.id)
    scrollToResource(resource.id, { topbarElement: 'admin-settings-app-bar' })
  }

  function handleNavigateAction(up = false) {
    const nextResource = unref(lastSelectedRowId)
      ? getNextResource(up)
      : unref(paginatedResources)[0]
    if (!nextResource) {
      return
    }

    keyActions.resetSelectionCursor()
    selectedRows.value = [nextResource]
    moveCursorTo(nextResource)
  }

  function handleShiftAction(up: boolean) {
    const nextResource = getNextResource(up)
    if (!nextResource) {
      return
    }

    // moving back towards the selection start deselects, moving away extends the selection
    const isShrinkingSelection = up
      ? unref(keyActions.selectionCursor) > 0
      : unref(keyActions.selectionCursor) < 0
    if (isShrinkingSelection) {
      toggleLastSelectedRow()
    } else {
      selectedRows.value.push(nextResource)
    }

    moveCursorTo(nextResource)
    keyActions.selectionCursor.value = unref(keyActions.selectionCursor) + (up ? -1 : 1)
  }

  function handleSelectAllAction() {
    keyActions.resetSelectionCursor()
    selectedRows.value = [...unref(paginatedResources)]
  }

  function handleEscAction() {
    keyActions.resetSelectionCursor()
    selectedRows.value = []
  }

  keyActions.bindKeyAction({ primary: Key.ArrowUp }, () => handleNavigateAction(true))
  keyActions.bindKeyAction({ primary: Key.ArrowDown }, () => handleNavigateAction())
  keyActions.bindKeyAction({ modifier: Modifier.Shift, primary: Key.ArrowUp }, () =>
    handleShiftAction(true)
  )
  keyActions.bindKeyAction({ modifier: Modifier.Shift, primary: Key.ArrowDown }, () =>
    handleShiftAction(false)
  )
  keyActions.bindKeyAction({ modifier: Modifier.Ctrl, primary: Key.A }, handleSelectAllAction)
  keyActions.bindKeyAction({ primary: Key.Space }, toggleLastSelectedRow)
  keyActions.bindKeyAction({ primary: Key.Esc }, handleEscAction)
}
