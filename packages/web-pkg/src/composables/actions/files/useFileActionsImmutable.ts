import { useGettext } from 'vue3-gettext'
import { FileAction } from '../types'
import { computed } from 'vue'
import { useMessages, useModals } from '../../piniaStores'
import { useClientService } from '../../clientService'

export const useFileActionsImmutable = () => {
  const { $gettext } = useGettext()
  const clientService = useClientService()
  const { showMessage, showErrorMessage } = useMessages()
  const { dispatchModal } = useModals()

  const callImmutableEndpoint = async (
    driveId: string,
    itemId: string,
    action: 'freeze' | 'protect',
    method: 'POST' | 'DELETE' = 'POST'
  ) => {
    const httpClient = clientService.httpAuthenticated
    const endpoint = action === 'freeze' ? 'freeze' : 'protect'
    try {
      const response = await httpClient.request({
        method,
        url: `/graph/v1beta1/drives/${driveId}/items/${itemId}/${endpoint}`
      })
      if (response.status === 204) {
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
    {
      name: 'freeze-file',
      icon: 'snowflake',
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
            callImmutableEndpoint(space.id, resource.id, 'freeze')
          }
        })
      },
      isVisible: ({ resources }) => {
        if (resources.length !== 1) return false
        const r = resources[0]
        return r.type === 'file' && !r.immutable
      },
      class: 'oc-files-actions-freeze-trigger'
    },
    {
      name: 'protect-folder',
      icon: 'shield-check',
      label: () => $gettext('Protect folder'),
      handler: ({ space, resources }) => {
        callImmutableEndpoint(space.id, resources[0].id, 'protect')
      },
      isVisible: ({ resources }) => {
        if (resources.length !== 1) return false
        const r = resources[0]
        return r.type === 'folder' && !r.immutable
      },
      class: 'oc-files-actions-protect-trigger'
    },
    {
      name: 'unprotect-folder',
      icon: 'shield',
      label: () => $gettext('Remove protection'),
      handler: ({ space, resources }) => {
        callImmutableEndpoint(space.id, resources[0].id, 'protect', 'DELETE')
      },
      isVisible: ({ resources }) => {
        if (resources.length !== 1) return false
        const r = resources[0]
        return r.type === 'folder' && r.immutable === true
      },
      class: 'oc-files-actions-unprotect-trigger'
    }
  ])

  return { actions }
}
