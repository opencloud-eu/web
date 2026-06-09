import {
  Key,
  KeyboardActions,
  Modifier,
  useClipboardStore,
  useResourcesStore
} from '@opencloud-eu/web-pkg'
import { SpaceResource } from '@opencloud-eu/web-client'
import { Ref, unref } from 'vue'
import { useFileActionsPaste } from '../actions'

export const useKeyboardFileSpaceActions = (
  keyActions: KeyboardActions,
  space: Ref<SpaceResource>
) => {
  const clipboardStore = useClipboardStore()
  const { copyResources, cutResources } = clipboardStore
  const resourcesStore = useResourcesStore()

  const { actions: pasteFileActions } = useFileActionsPaste()
  const pasteFileAction = unref(pasteFileActions)[0].handler

  // Copy/cut/paste in or out of a vault isn't supported (the worker can't
  // re-encrypt content) and is blocked on the context-menu actions. The
  // keyboard shortcuts bypass those isVisible guards, so gate them here too.
  const selectionInVault = () => resourcesStore.selectedResources.some((r) => r.isInVault)
  const currentFolderInVault = () => !!resourcesStore.currentFolder?.isInVault

  keyActions.bindKeyAction({ modifier: Modifier.Ctrl, primary: Key.C }, () => {
    if (selectionInVault()) {
      return
    }
    copyResources(resourcesStore.selectedResources)
  })

  keyActions.bindKeyAction(
    { modifier: Modifier.Ctrl, primary: Key.V },
    () => {
      if (clipboardStore.resources.length && !currentFolderInVault()) {
        pasteFileAction({ space: unref(space) })
      }
    },
    {
      // don't prevent default so the paste event from the local clipboard can still be handled
      preventDefault: false
    }
  )

  keyActions.bindKeyAction({ modifier: Modifier.Ctrl, primary: Key.X }, () => {
    if (selectionInVault()) {
      return
    }
    cutResources(resourcesStore.selectedResources)
  })
}
