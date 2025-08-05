import {
  Key,
  KeyboardActions,
  Modifier,
  useClipboardStore,
  useResourcesStore
} from '@opencloud-eu/web-pkg'
import { SpaceResource } from '@opencloud-eu/web-client'
import { Ref, unref } from 'vue'
import { useFileActionsPaste } from '@opencloud-eu/web-pkg'

export const useKeyboardFileSpaceActions = (
  keyActions: KeyboardActions,
  space: Ref<SpaceResource>
) => {
  const clipboardStore = useClipboardStore()
  const { copyResources, cutResources } = clipboardStore
  const resourcesStore = useResourcesStore()

  const { actions: pasteFileActions } = useFileActionsPaste()
  const pasteFileAction = unref(pasteFileActions)[0].handler

  keyActions.bindKeyAction({ modifier: Modifier.Ctrl, primary: Key.C }, () => {
    copyResources(resourcesStore.selectedResources)
  })

  keyActions.bindKeyAction(
    { modifier: Modifier.Ctrl, primary: Key.V },
    () => {
      if (clipboardStore.resources.length) {
        pasteFileAction({ space: unref(space) })
      }
    },
    {
      // don't prevent default so the paste event from the local clipboard can still be handled
      preventDefault: false
    }
  )

  keyActions.bindKeyAction({ modifier: Modifier.Ctrl, primary: Key.X }, () => {
    cutResources(resourcesStore.selectedResources)
  })
}
