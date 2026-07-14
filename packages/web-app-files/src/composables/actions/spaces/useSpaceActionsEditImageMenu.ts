import { isProjectSpaceResource } from '@opencloud-eu/web-client'
import { computed, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { SpaceAction, useUserStore } from '@opencloud-eu/web-pkg'
import { useSpaceActionsSetIcon } from './useSpaceActionsSetIcon'
import { useSpaceActionsUploadImage } from './useSpaceActionsUploadImage'
import { useSpaceActionsDeleteImage } from './useSpaceActionsDeleteImage'

export const useSpaceActionsEditImageMenu = () => {
  const userStore = useUserStore()
  const { $gettext } = useGettext()

  const { actions: setSpaceIconActions } = useSpaceActionsSetIcon()
  const { actions: uploadSpaceImage } = useSpaceActionsUploadImage()
  const { actions: deleteSpaceImageActions } = useSpaceActionsDeleteImage()

  const actions = computed((): SpaceAction[] => [
    {
      name: 'edit-space-image-menu',
      icon: 'image',
      children: [
        ...unref(uploadSpaceImage),
        ...unref(setSpaceIconActions),
        ...unref(deleteSpaceImageActions)
      ],
      label: () => {
        return $gettext('Edit image')
      },
      isVisible: ({ resources }) => {
        if (!resources || resources.length !== 1) {
          return false
        }

        const space = resources[0]
        if (!isProjectSpaceResource(space)) {
          return false
        }
        return space.canEditImage({ user: userStore.user })
      },
      class: 'oc-files-actions-edit-space-image-menu-trigger'
    }
  ])

  return {
    actions
  }
}
