import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import { SpaceResource } from '@opencloud-eu/web-client'
import { SpaceAction, SpaceActionOptions } from '../types'
import { useClientService } from '../../clientService'
import { useMessages, useModals, useSpacesStore, useUserStore } from '../../piniaStores'

export const useSpaceActionsDeleteImage = () => {
  const userStore = useUserStore()
  const { $gettext } = useGettext()
  const { dispatchModal } = useModals()
  const { graphAuthenticated, webdav } = useClientService()
  const spacesStore = useSpacesStore()
  const { showMessage, showErrorMessage } = useMessages()

  const deleteSpaceImage = async ({ space }: { space: SpaceResource }) => {
    try {
      await webdav.deleteFile(space, {
        path: '.space/image.png'
      })

      await graphAuthenticated.drives.updateDrive(space.id, {
        name: space.name,
        special: [{ specialFolder: { name: 'image' }, id: null }]
      })

      spacesStore.updateSpaceField({
        id: space.id,
        field: 'spaceImageData',
        value: null
      })

      spacesStore.updateSpaceField({
        id: space.id,
        field: 'thumbnail',
        value: null
      })

      showMessage({ title: $gettext('Space image deleted successfully') })
    } catch (error) {
      console.error(error)
      showErrorMessage({
        title: $gettext('Failed to delete space image'),
        errors: [error]
      })
    }
  }

  const handler = ({ resources }: SpaceActionOptions) => {
    dispatchModal({
      title: $gettext('Delete %{ space } image', { space: resources[0].name }),
      confirmText: $gettext('Delete'),
      onConfirm: () => deleteSpaceImage({ space: resources[0] }),
      message: $gettext('Are you sure you want to delete the image of %{ space }?', {
        space: resources[0].name
      })
    })
  }

  const actions = computed((): SpaceAction[] => [
    {
      name: 'delete-space-image',
      icon: 'delete-bin',
      handler,
      label: () => {
        return $gettext('Delete image')
      },
      isVisible: ({ resources }) => {
        if (resources.length !== 1) {
          return false
        }

        if (!resources[0].spaceImageData) {
          return false
        }

        return resources[0].canEditImage({ user: userStore.user })
      },
      class: 'oc-files-actions-delete-space-image-trigger'
    }
  ])

  return {
    actions,

    deleteSpaceImage
  }
}
