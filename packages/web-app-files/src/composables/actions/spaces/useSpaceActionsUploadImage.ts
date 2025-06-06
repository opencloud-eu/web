import { computed, unref, VNodeRef } from 'vue'
import { SpaceResource } from '@opencloud-eu/web-client'
import {
  SpaceAction,
  SpaceActionOptions,
  SpaceImageModal,
  useModals,
  useUserStore
} from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'

export const useSpaceActionsUploadImage = ({ spaceImageInput }: { spaceImageInput: VNodeRef }) => {
  const userStore = useUserStore()
  const { $gettext } = useGettext()
  const { dispatchModal } = useModals()

  let selectedSpace: SpaceResource = null
  const handler = ({ resources }: SpaceActionOptions) => {
    if (resources.length !== 1) {
      return
    }

    selectedSpace = resources[0] as SpaceResource
    unref(spaceImageInput)?.click()
  }

  const showModalImageSpace = (event: InputEvent) => {
    const file = (event.currentTarget as HTMLInputElement).files[0]
    unref(spaceImageInput).value = ''

    dispatchModal({
      title: $gettext('Crop your Space image'),
      confirmText: $gettext('Confirm'),
      customComponent: SpaceImageModal,
      focusTrapInitial: false,
      customComponentAttrs: () => ({ file, space: unref(selectedSpace) })
    })
  }

  const actions = computed((): SpaceAction[] => [
    {
      name: 'upload-space-image',
      icon: 'image-add',
      handler,
      label: () => {
        return $gettext('Edit image')
      },
      isVisible: ({ resources }) => {
        if (resources.length !== 1) {
          return false
        }

        return resources[0].canEditImage({ user: userStore.user })
      },
      class: 'oc-files-actions-upload-space-image-trigger'
    }
  ])

  return {
    actions,
    showModalImageSpace
  }
}
