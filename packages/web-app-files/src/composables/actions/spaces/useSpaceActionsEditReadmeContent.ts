import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import {
  getRelativeSpecialFolderSpacePath,
  isProjectSpaceResource,
  SpaceResource
} from '@opencloud-eu/web-client'
import {
  SpaceAction,
  SpaceActionOptions,
  useClientService,
  useCreateSpace,
  useFileActions,
  useUserStore
} from '@opencloud-eu/web-pkg'

export const useSpaceActionsEditReadmeContent = () => {
  const clientService = useClientService()
  const { triggerDefaultAction } = useFileActions()
  const { setSpaceReadme } = useCreateSpace()
  const userStore = useUserStore()
  const { $gettext } = useGettext()

  /**
   * The readme the space already has, or a fresh, empty one. A `readme.md` that
   * is on disk but not registered on the drive gets opened as it is - writing an
   * empty one over it would throw away a description nobody asked to delete.
   */
  const getReadme = async (space: SpaceResource) => {
    const path = getRelativeSpecialFolderSpacePath(space, 'readme') || '.space/readme.md'

    try {
      return await clientService.webdav.getFileInfo(space, { path })
    } catch (error) {
      if (error?.statusCode !== 404) {
        throw error
      }
    }

    return setSpaceReadme(space, '')
  }

  const handler = async ({ resources }: SpaceActionOptions) => {
    const space = resources[0]
    triggerDefaultAction({ space, resources: [await getReadme(space)] })
  }

  const actions = computed((): SpaceAction[] => [
    {
      name: 'editReadmeContent',
      icon: 'article',
      label: () => {
        return $gettext('Edit description')
      },
      handler,
      isVisible: ({ resources }) => {
        if (resources.length !== 1) {
          return false
        }

        if (!isProjectSpaceResource(resources[0])) {
          return false
        }

        return resources[0].canEditReadme({ user: userStore.user })
      },
      class: 'oc-files-actions-edit-readme-content-trigger'
    }
  ])

  return {
    actions
  }
}
