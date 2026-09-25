import { isProjectSpaceResource } from '@opencloud-eu/web-client'
import { computed, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { SpaceAction } from '@opencloud-eu/web-pkg'
import { useSpaceActionsEditDescription } from './useSpaceActionsEditDescription'
import { useSpaceActionsEditReadmeContent } from './useSpaceActionsEditReadmeContent'
import { useSpaceActionsSetIcon } from './useSpaceActionsSetIcon'
import { useSpaceActionsUploadImage } from './useSpaceActionsUploadImage'
import { useSpaceActionsDeleteImage } from './useSpaceActionsDeleteImage'

export const useSpaceActionsCustomizeMenu = () => {
  const { $gettext } = useGettext()

  const { actions: editDescriptionActions } = useSpaceActionsEditDescription()
  const { actions: editReadmeContentActions } = useSpaceActionsEditReadmeContent()
  const { actions: setSpaceIconActions } = useSpaceActionsSetIcon()
  const { actions: uploadSpaceImage } = useSpaceActionsUploadImage()
  const { actions: deleteSpaceImageActions } = useSpaceActionsDeleteImage()

  const children = computed((): SpaceAction[] => [
    ...[...unref(editDescriptionActions), ...unref(editReadmeContentActions)].map((action) => ({
      ...action,
      category: 'primary' as const
    })),
    ...[
      ...unref(uploadSpaceImage),
      ...unref(setSpaceIconActions),
      ...unref(deleteSpaceImageActions)
    ].map((action) => ({ ...action, category: 'secondary' as const }))
  ])

  const actions = computed((): SpaceAction[] => [
    {
      name: 'customize-space-menu',
      icon: 'palette',
      children: unref(children),
      label: () => {
        return $gettext('Customize')
      },
      isVisible: (options) => {
        const { resources } = options
        if (!resources || resources.length !== 1) {
          return false
        }

        if (!isProjectSpaceResource(resources[0])) {
          return false
        }

        return unref(children).some((child) => child.isVisible(options))
      },
      class: 'oc-files-actions-customize-space-menu-trigger'
    }
  ])

  return {
    actions
  }
}
