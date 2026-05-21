import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import {
  isPersonalSpaceResource,
  isProjectSpaceResource,
  isShareSpaceResource
} from '@opencloud-eu/web-client'
import {
  FileAction,
  isLocationTrashActive,
  useClipboardStore,
  useRouter
} from '@opencloud-eu/web-pkg'

export const useFileActionsClearClipboard = () => {
  const router = useRouter()
  const { $gettext } = useGettext()
  const clipboardStore = useClipboardStore()

  const actions = computed((): FileAction[] => [
    {
      name: 'clearClipboard',
      icon: 'eraser',
      handler: () => {
        clipboardStore.clearClipboard()
      },
      label: () => $gettext('Clear clipboard'),
      isVisible: ({ space }) => {
        if (clipboardStore.resources.length === 0) {
          return false
        }

        if (isLocationTrashActive(router, 'files-trash-generic')) {
          return false
        }

        return (
          isProjectSpaceResource(space) ||
          isPersonalSpaceResource(space) ||
          isShareSpaceResource(space)
        )
      },
      hideLabel: true,
      class: 'oc-files-actions-clear-clipboard'
    }
  ])

  return {
    actions
  }
}
