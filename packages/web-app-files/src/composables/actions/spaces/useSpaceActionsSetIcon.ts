import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import { HttpError, isProjectSpaceResource, SpaceResource } from '@opencloud-eu/web-client'
import {
  EmojiPickerModal,
  SpaceAction,
  SpaceActionOptions,
  blobToArrayBuffer,
  canvasToBlob,
  eventBus,
  useClientService,
  useCreateSpace,
  useLoadingService,
  useMessages,
  useModals,
  useSpaceHelpers,
  useSpacesStore,
  useUserStore
} from '@opencloud-eu/web-pkg'

export const useSpaceActionsSetIcon = () => {
  const userStore = useUserStore()
  const { showMessage, showErrorMessage } = useMessages()
  const { $gettext } = useGettext()
  const clientService = useClientService()
  const loadingService = useLoadingService()
  const spacesStore = useSpacesStore()
  const { createDefaultMetaFolder } = useCreateSpace()
  const { dispatchModal } = useModals()
  const { getDefaultMetaFolder } = useSpaceHelpers()

  const handler = ({ resources }: SpaceActionOptions) => {
    if (resources.length !== 1) {
      return
    }

    dispatchModal({
      elementClass: 'w-auto',
      title: $gettext('Set icon for »%{space}«', { space: resources[0].name }),
      hideConfirmButton: true,
      customComponent: EmojiPickerModal,
      focusTrapInitial: false,
      onConfirm: (emoji: string) => setIconSpace(resources[0], emoji)
    })
  }

  const generateEmojiImage = async (emoji: string): Promise<ArrayBuffer | string> => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    const aspectRatio = 16 / 9
    const width = 720
    const height = width / aspectRatio

    canvas.width = width
    canvas.height = height

    const textSize = 0.4 * width
    context.font = `${textSize}px sans-serif`
    context.textBaseline = 'middle'
    context.textAlign = 'center'

    const heightOffset = 15
    context.fillText(emoji, canvas.width / 2, canvas.height / 2 + heightOffset)

    const blob = await canvasToBlob(canvas)
    return blobToArrayBuffer(blob)
  }

  const setIconSpace = async (space: SpaceResource, emoji: string) => {
    const graphClient = clientService.graphAuthenticated
    const content = await generateEmojiImage(emoji)

    let metaFolder = await getDefaultMetaFolder(space)
    if (!metaFolder) {
      metaFolder = await createDefaultMetaFolder(space)
    }

    return loadingService.addTask(async () => {
      const headers = {
        'Content-Type': 'application/offset+octet-stream'
      }

      try {
        const { fileId } = await clientService.webdav.putFileContents(space, {
          parentFolderId: metaFolder.id,
          fileName: 'image.png',
          content,
          headers,
          overwrite: true
        })

        const updatedSpace = await graphClient.drives.updateDrive(space.id, {
          name: space.name,
          special: [{ specialFolder: { name: 'image' }, id: fileId }]
        })

        spacesStore.updateSpaceField({
          id: space.id,
          field: 'spaceImageData',
          value: updatedSpace.spaceImageData
        })
        showMessage({ title: $gettext('Space icon was set successfully') })
        eventBus.publish('app.files.spaces.uploaded-image', updatedSpace)
      } catch (error) {
        console.error(error)

        if (error instanceof HttpError && error.statusCode === 507) {
          showErrorMessage({
            title: $gettext('Failed to set space icon'),
            desc: $gettext('Not enough quota to set the space icon'),
            errors: [error]
          })
          return
        }

        showErrorMessage({
          title: $gettext('Failed to set space icon'),
          errors: [error]
        })
      }
    })
  }

  const actions = computed((): SpaceAction[] => [
    {
      name: 'set-space-icon',
      icon: 'emoji-sticker',
      handler,
      label: () => {
        return $gettext('Set icon')
      },
      isVisible: ({ resources }) => {
        if (resources.length !== 1) {
          return false
        }

        if (!isProjectSpaceResource(resources[0])) {
          return false
        }

        return resources[0].canEditImage({ user: userStore.user })
      },
      class: 'oc-files-actions-set-space-icon-trigger'
    }
  ])

  return {
    actions,
    setIconSpace
  }
}
