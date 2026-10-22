import {
  Key,
  KeyboardActions,
  Modifier,
  useClipboardStore,
  useGetMatchingSpace,
  useResourcesStore
} from '@opencloud-eu/web-pkg'
import { unref } from 'vue'
import { useFileActionsCopy } from '../actions'

export const useKeyboardFileActions = (keyActions: KeyboardActions) => {
  const resourcesStore = useResourcesStore()
  const { copyResources } = useClipboardStore()
  const { getMatchingSpace } = useGetMatchingSpace()
  const { actions: copyActions } = useFileActionsCopy()

  keyActions.bindKeyAction({ modifier: Modifier.Ctrl, primary: Key.C }, () => {
    const resources = resourcesStore.selectedResources
    if (!resources.length) {
      return
    }

    // same checks as the copy action in the context menu, which gets the space of the resource
    const space = getMatchingSpace(resources[0])
    if (!unref(copyActions)[0].isVisible({ space, resources })) {
      return
    }

    copyResources(resources)
  })
}
