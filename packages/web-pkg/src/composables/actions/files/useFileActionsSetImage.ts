import { isLocationSpacesActive } from '../../../router'
import { usePreviewService } from '../../previewService'
import { useClientService } from '../../clientService'
import { useLoadingService } from '../../loadingService'
import { useRouter } from '../../router'
import { useGettext } from 'vue3-gettext'
import { computed, markRaw } from 'vue'
import { FileAction, FileActionOptions } from '../types'
import { useModals, useUserStore } from '../../piniaStores'
import { SpaceImageModal } from '../../../components'

export const useFileActionsSetImage = () => {
  const userStore = useUserStore()
  const router = useRouter()
  const { $gettext } = useGettext()
  const clientService = useClientService()
  const loadingService = useLoadingService()
  const previewService = usePreviewService()
  const { dispatchModal } = useModals()

  const handler = async ({ space, resources }: FileActionOptions) => {
    const { getFileContents } = clientService.webdav

    const response = await getFileContents(space, resources[0], {
      responseType: 'blob'
    })
    const file = new File([response.body], resources[0].name)

    dispatchModal({
      title: $gettext('Crop your Space image'),
      confirmText: $gettext('Confirm'),
      customComponent: markRaw(SpaceImageModal),
      customComponentAttrs: () => ({ file, space: space })
    })
  }

  const actions = computed((): FileAction[] => [
    {
      name: 'set-space-image',
      icon: 'image-edit',
      handler: (args) => loadingService.addTask(() => handler(args)),
      label: () => {
        return $gettext('Set as space image')
      },
      isVisible: ({ space, resources }) => {
        if (resources.length !== 1) {
          return false
        }
        if (!resources[0].mimeType) {
          return false
        }
        if (!previewService.isMimetypeSupported(resources[0].mimeType, true)) {
          return false
        }

        if (!isLocationSpacesActive(router, 'files-spaces-generic')) {
          return false
        }
        if (!space) {
          return false
        }

        return space.canEditImage({ user: userStore.user })
      },
      class: 'oc-files-actions-set-space-image-trigger'
    }
  ])

  return {
    actions
  }
}
