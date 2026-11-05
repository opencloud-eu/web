import { isProjectSpaceResource } from '@opencloud-eu/web-client'
import { computed, markRaw } from 'vue'
import { useGettext } from 'vue3-gettext'
import {
  FileAction,
  FileActionOptions,
  useResourcesStore,
  SpaceImageModal,
  useClientService,
  useLoadingService,
  useMessages,
  useModals,
  useUserStore
} from '@opencloud-eu/web-pkg'
import { useSpaceImage } from '../../spaces'

export const useSpaceActionsSetImage = () => {
  const userStore = useUserStore()
  const resourcesStore = useResourcesStore()
  const { $gettext } = useGettext()
  const clientService = useClientService()
  const loadingService = useLoadingService()
  const { dispatchModal } = useModals()
  const { showErrorMessage } = useMessages()
  const { saveSpaceImage } = useSpaceImage()

  const handler = async ({ space, resources }: FileActionOptions) => {
    const { getFileContents } = clientService.webdav

    let file: File
    try {
      const response = await getFileContents(space, resources[0], {
        responseType: 'blob'
      })
      file = new File([response.body], resources[0].name)
    } catch (error) {
      console.error(error)
      showErrorMessage({
        title: $gettext('Failed to set space image'),
        errors: [error]
      })
      return
    }

    dispatchModal({
      title: $gettext('Crop your Space image'),
      confirmText: $gettext('Confirm'),
      customComponent: markRaw(SpaceImageModal),
      focusTrapInitial: '#image-cropper-selection',
      customComponentAttrs: () => ({
        file,
        save: (content: ArrayBuffer) => saveSpaceImage(space, content)
      })
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

        if (!resources[0].hasPreview?.() || !resources[0].mimeType?.includes('image/')) {
          return false
        }

        if (!space) {
          return false
        }
        if (!isProjectSpaceResource(space) || !resourcesStore.currentFolder) {
          // Only visible inside project spaces.
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
