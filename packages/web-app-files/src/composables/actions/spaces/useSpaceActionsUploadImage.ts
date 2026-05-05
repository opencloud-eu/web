import { computed, onBeforeUnmount, unref } from 'vue'
import { isProjectSpaceResource, SpaceResource } from '@opencloud-eu/web-client'
import {
  SpaceAction,
  SpaceActionOptions,
  SpaceImageModal,
  useModals,
  useUserStore
} from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'

export const useSpaceActionsUploadImage = () => {
  const userStore = useUserStore()
  const { $gettext } = useGettext()
  const { dispatchModal } = useModals()

  let selectedSpace: SpaceResource = null
  let fileInput: HTMLInputElement = null

  const removeFileInput = () => {
    if (!fileInput) {
      return
    }

    fileInput.remove()
    fileInput = null
  }

  const onFileSelected = (event: Event) => {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    removeFileInput()

    if (!file || !selectedSpace) {
      return
    }

    dispatchModal({
      title: $gettext('Crop image for »%{space}«', { space: selectedSpace.name }),
      confirmText: $gettext('Confirm'),
      customComponent: SpaceImageModal,
      focusTrapInitial: '#image-cropper-selection',
      customComponentAttrs: () => ({ file, space: unref(selectedSpace) })
    })
  }

  const openFilePicker = () => {
    removeFileInput()

    fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.name = 'file'
    fileInput.accept = 'image/jpeg, image/png'
    fileInput.tabIndex = -1
    fileInput.hidden = true
    fileInput.style.position = 'absolute'
    fileInput.style.left = '-99999px'
    fileInput.addEventListener('change', onFileSelected, { once: true })
    document.body.append(fileInput)
    fileInput.click()
  }

  onBeforeUnmount(() => {
    removeFileInput()
  })

  const handler = ({ resources }: SpaceActionOptions) => {
    if (resources.length !== 1) {
      return
    }

    selectedSpace = resources[0] as SpaceResource
    openFilePicker()
  }

  const actions = computed((): SpaceAction[] => [
    {
      name: 'upload-space-image',
      icon: 'image-add',
      handler,
      label: () => {
        return $gettext('Set image')
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
      class: 'oc-files-actions-upload-space-image-trigger'
    }
  ])

  return {
    actions
  }
}
