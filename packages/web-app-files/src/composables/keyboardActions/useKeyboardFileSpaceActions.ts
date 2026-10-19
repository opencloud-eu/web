import {
  Key,
  KeyboardActions,
  Modifier,
  useClipboardStore,
  useResourcesStore
} from '@opencloud-eu/web-pkg'
import { SpaceResource } from '@opencloud-eu/web-client'
import { Ref, unref } from 'vue'
import { useFileActionsCopy, useFileActionsMove, useFileActionsPaste } from '../actions'

export const useKeyboardFileSpaceActions = (
  keyActions: KeyboardActions,
  space: Ref<SpaceResource>
) => {
  const clipboardStore = useClipboardStore()
  const { copyResources, cutResources } = clipboardStore
  const resourcesStore = useResourcesStore()

  const { actions: copyActions } = useFileActionsCopy()
  const { actions: moveActions } = useFileActionsMove()
  const { actions: pasteActions, isMovingIntoSameFolder } = useFileActionsPaste()

  // The shortcuts run the same checks as the matching context menu actions
  // (copy, move and paste), so they do nothing where those aren't offered.
  keyActions.bindKeyAction({ modifier: Modifier.Ctrl, primary: Key.C }, () => {
    const resources = resourcesStore.selectedResources
    if (!unref(copyActions)[0].isVisible({ space: unref(space), resources })) {
      return
    }
    copyResources(resources)
  })

  keyActions.bindKeyAction(
    { modifier: Modifier.Ctrl, primary: Key.V },
    () => {
      const pasteAction = unref(pasteActions)[0]
      const options = { space: unref(space) }
      if (!pasteAction.isVisible(options)) {
        return
      }
      // cutting into the same folder is passed on, the handler explains why nothing happens
      if (pasteAction.isDisabled?.(options) && !unref(isMovingIntoSameFolder)) {
        return
      }
      pasteAction.handler(options)
    },
    {
      // don't prevent default so the paste event from the local clipboard can still be handled
      preventDefault: false
    }
  )

  keyActions.bindKeyAction({ modifier: Modifier.Ctrl, primary: Key.X }, () => {
    const resources = resourcesStore.selectedResources
    if (!unref(moveActions)[0].isVisible({ space: unref(space), resources })) {
      return
    }
    cutResources(resources)
  })
}
