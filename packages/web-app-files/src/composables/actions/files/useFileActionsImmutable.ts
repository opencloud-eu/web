import { useGettext } from 'vue3-gettext'
import { FileAction, useMessages, useModals, useResourcesStore, useClientService } from '@opencloud-eu/web-pkg'
import { computed } from 'vue'

export const useFileActionsImmutable = () => {
  const { $gettext } = useGettext()
  const clientService = useClientService()
  const { showMessage, showErrorMessage } = useMessages()
  const { dispatchModal } = useModals()
  const resourcesStore = useResourcesStore()

  const resolveNewState = (
    resource: { id: string; parentFolderId?: string },
    explicitState: 'frozen' | 'protected' | undefined
  ): 'frozen' | 'protected' | 'shielded' | undefined => {
    if (explicitState) return explicitState
    // After unprotect: check if current folder (parent) is still protected → shielded
    const currentFolder = resourcesStore.currentFolder
    if (currentFolder?.immutableState === 'protected' || currentFolder?.immutableState === 'shielded') {
      return 'shielded'
    }
    return undefined
  }

  const callImmutableEndpoint = async (
    driveId: string,
    resource: { id: string; parentFolderId?: string },
    action: 'freeze' | 'protect',
    method: 'POST' | 'DELETE' = 'POST',
    newState: 'frozen' | 'protected' | undefined = undefined
  ) => {
    const httpClient = clientService.httpAuthenticated
    const endpoint = action === 'freeze' ? 'freeze' : 'protect'
    try {
      const response = await httpClient.request({
        method,
        url: `/graph/v1beta1/drives/${driveId}/items/${resource.id}/${endpoint}`
      })
      if (response.status === 204) {
        resourcesStore.updateResourceField({
          id: resource.id,
          field: 'immutableState',
          value: resolveNewState(resource, newState)
        })
        const msg =
          action === 'freeze'
            ? $gettext('File has been frozen.')
            : method === 'POST'
              ? $gettext('Folder has been protected.')
              : $gettext('Folder protection has been removed.')
        showMessage({ title: msg })
      }
    } catch (e) {
      showErrorMessage({
        title: $gettext('Operation failed'),
        errors: [e as Error]
      })
    }
  }

  const actions = computed((): FileAction[] => [
    // File: normal → leaf → freeze (with confirmation)
    {
      name: 'freeze-file',
      icon: 'leaf',
      label: () => $gettext('Freeze file'),
      handler: ({ space, resources }) => {
        const resource = resources[0]
        dispatchModal({
          title: $gettext('Freeze file permanently?'),
          confirmText: $gettext('Freeze'),
          message: $gettext(
            'Freezing a file is irreversible. The file content cannot be changed or deleted afterwards. Are you sure?'
          ),
          onConfirm: () => {
            callImmutableEndpoint(space.id, resource, 'freeze', 'POST', 'frozen')
          }
        })
      },
      isVisible: ({ resources }) => {
        if (resources.length !== 1) return false
        const r = resources[0]
        return r.type === 'file' && !r.immutableState
      },
      class: 'oc-files-actions-freeze-trigger'
    },
    // File: frozen → snowflake (disabled)
    {
      name: 'frozen-file',
      icon: 'snowflake',
      label: () => $gettext('File is frozen'),
      handler: () => {},
      isVisible: ({ resources }) => {
        if (resources.length !== 1) return false
        const r = resources[0]
        return r.type === 'file' && r.immutableState === 'frozen'
      },
      isDisabled: () => true,
      disabledTooltip: () => $gettext('This file is permanently frozen and cannot be modified.'),
      class: 'oc-files-actions-frozen-indicator'
    },
    // File: shielded (inherited from parent) → shield (disabled)
    {
      name: 'shielded-file',
      icon: 'shield',
      label: () => $gettext('File is in a protected folder'),
      handler: () => {},
      isVisible: ({ resources }) => {
        if (resources.length !== 1) return false
        const r = resources[0]
        return r.type === 'file' && r.immutableState === 'shielded'
      },
      isDisabled: () => true,
      disabledTooltip: () => $gettext('This file is in a protected folder and cannot be modified.'),
      class: 'oc-files-actions-shielded-file-indicator'
    },
    // Folder(s): normal/shielded → protect (single + batch)
    {
      name: 'protect-folder',
      icon: 'shield',
      label: (options) =>
        options?.resources?.length > 1
          ? $gettext('Protect %{count} folders', { count: String(options.resources.length) })
          : $gettext('Protect folder'),
      handler: ({ space, resources }) => {
        for (const r of resources) {
          callImmutableEndpoint(space.id, r, 'protect', 'POST', 'protected')
        }
      },
      isVisible: ({ resources }) => {
        if (!resources.length) return false
        return resources.every(
          (r) => r.type === 'folder' && (!r.immutableState || r.immutableState === 'shielded')
        )
      },
      class: 'oc-files-actions-protect-trigger'
    },
    // Folder(s): protected → unprotect (single + batch)
    {
      name: 'unprotect-folder',
      icon: 'shield',
      label: (options) =>
        options?.resources?.length > 1
          ? $gettext('Unprotect %{count} folders', { count: String(options.resources.length) })
          : $gettext('Remove protection'),
      handler: ({ space, resources }) => {
        for (const r of resources) {
          callImmutableEndpoint(space.id, r, 'protect', 'DELETE')
        }
      },
      isVisible: ({ resources }) => {
        if (!resources.length) return false
        return resources.every(
          (r) => r.type === 'folder' && r.immutableState === 'protected'
        )
      },
      class: 'oc-files-actions-unprotect-trigger'
    }
  ])

  return { actions }
}
