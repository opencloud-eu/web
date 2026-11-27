import type { Language } from 'vue3-gettext'
import {
  ActionExtension,
  AppNavigationItemDrop,
  FileAction,
  FileActionOptions,
  isResourceDrag,
  useExtensionRegistry,
  useResourcesStore
} from '@opencloud-eu/web-pkg'
import { contextActionsExtensionPoint } from '../extensionPoints'
import { deleteFileActionExtensionId } from '../composables/extensions/useFileActions'

/**
 * Lets resources dragged out of a resource view be dropped onto the trash navigation item.
 * The drop deletes them via the delete file action, which also decides whether a drop is allowed.
 */
export function createTrashNavItemDrop({
  $gettext
}: {
  $gettext: Language['$gettext']
}): AppNavigationItemDrop {
  const resourcesStore = useResourcesStore()
  const extensionRegistry = useExtensionRegistry()

  // the delete action can't be created here: navItems() doesn't run in a setup context, which the
  // action's composables need. the registered action gets looked up at drop time instead, which
  // also respects extensions disabled by the admin.
  function getDeleteAction() {
    return extensionRegistry
      .requestExtensions<ActionExtension>(contextActionsExtensionPoint)
      .find(({ id }) => id === deleteFileActionExtensionId)?.action as FileAction
  }

  function getActionOptions(event: DragEvent): FileActionOptions {
    // external drags (like files from the operating system) are no resource drags
    if (!isResourceDrag(event) || !resourcesStore.draggedResources.length) {
      return null
    }
    // the delete action resolves the space of each resource itself
    return { space: null, resources: resourcesStore.draggedResources }
  }

  function isAllowed(event: DragEvent) {
    const options = getActionOptions(event)
    const deleteAction = getDeleteAction()
    if (!options || !deleteAction) {
      return false
    }
    return deleteAction.isVisible(options) && !deleteAction.isDisabled?.(options)
  }

  function handler(event: DragEvent) {
    getDeleteAction().handler(getActionOptions(event))
  }

  function notAllowedMessage(event: DragEvent) {
    if (!getActionOptions(event)) {
      return ''
    }
    return $gettext("One or more items can't be deleted")
  }

  return { isAllowed, handler, notAllowedMessage }
}
