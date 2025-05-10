import {
  Key,
  KeyboardActions,
  Modifier,
  useClipboardStore,
  useResourcesStore
} from '@opencloud-eu/web-pkg'

export const useKeyboardFileActions = (keyActions: KeyboardActions) => {
  const resourcesStore = useResourcesStore()
  const { copyResources } = useClipboardStore()

  keyActions.bindKeyAction({ modifier: Modifier.Ctrl, primary: Key.C }, () => {
    copyResources(resourcesStore.selectedResources)
  })
}
