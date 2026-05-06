import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import { Drive } from '@opencloud-eu/web-client/graph/generated'
import { SpaceResource, isProjectSpaceResource } from '@opencloud-eu/web-client'
import {
  SpaceAction,
  SpaceActionOptions,
  isLocationSpacesActive,
  resolveFileNameDuplicate,
  useAbility,
  useClientService,
  useConfigStore,
  useLoadingService,
  useMessages,
  useResourcesStore,
  useRouter,
  useSharesStore,
  useSpacesStore
} from '@opencloud-eu/web-pkg'
import PQueue from 'p-queue'

export const useSpaceActionsDuplicate = () => {
  const configStore = useConfigStore()
  const spacesStore = useSpacesStore()
  const sharesStore = useSharesStore()
  const { showMessage, showErrorMessage } = useMessages()
  const router = useRouter()
  const { $gettext } = useGettext()
  const ability = useAbility()
  const clientService = useClientService()
  const loadingService = useLoadingService()
  const { upsertResource } = useResourcesStore()

  const duplicateSpace = async (existingSpace: SpaceResource) => {
    const projectSpaces = spacesStore.spaces.filter(isProjectSpaceResource)
    const duplicatedSpaceName = resolveFileNameDuplicate(existingSpace.name, '', projectSpaces)

    try {
      let duplicatedSpace = await clientService.graphAuthenticated.drives.createDrive({
        name: duplicatedSpaceName,
        description: existingSpace.description,
        quota: { total: existingSpace.spaceQuota.total }
      })

      const existingSpaceFiles = await clientService.webdav.listFiles(existingSpace)

      if (existingSpaceFiles.children.length) {
        const queue = new PQueue({
          concurrency: configStore.options.concurrentRequests.resourceBatchActions
        })
        const copyOps = []

        for (const file of existingSpaceFiles.children) {
          copyOps.push(
            queue.add(() =>
              clientService.webdav.copyFiles(existingSpace, file, duplicatedSpace, {
                path: file.name
              })
            )
          )
        }
        await Promise.all(copyOps)
      }

      if (existingSpace.spaceReadmeData || existingSpace.spaceImageData) {
        const specialRequestData = {
          special: []
        } as Drive

        if (existingSpace.spaceReadmeData) {
          const newSpaceReadmeFile = await clientService.webdav.getFileInfo(duplicatedSpace, {
            path: `.space/${existingSpace.spaceReadmeData.name}`
          })
          specialRequestData.special.push({
            specialFolder: {
              name: 'readme'
            },
            id: newSpaceReadmeFile.id
          })
        }

        if (existingSpace.spaceImageData) {
          const newSpaceImageFile = await clientService.webdav.getFileInfo(duplicatedSpace, {
            path: `.space/${existingSpace.spaceImageData.name}`
          })
          specialRequestData.special.push({
            specialFolder: {
              name: 'image'
            },
            id: newSpaceImageFile.id
          })
        }

        duplicatedSpace = await clientService.graphAuthenticated.drives.updateDrive(
          duplicatedSpace.id,
          specialRequestData,
          sharesStore.graphRoles
        )
      }

      spacesStore.upsertSpace(duplicatedSpace)
      const isProjectsLocation = isLocationSpacesActive(router, 'files-spaces-projects')
      if (isProjectsLocation) {
        upsertResource(duplicatedSpace)
      }

      showMessage({
        title: $gettext('Space »%{space}« was duplicated successfully', {
          space: existingSpace.name
        })
      })
    } catch (error) {
      console.error(error)
      showErrorMessage({
        title: $gettext('Failed to duplicate space »%{space}«', { space: existingSpace.name }),
        errors: [error]
      })
    }
  }

  const handler = async ({ resources }: SpaceActionOptions) => {
    for (const resource of resources) {
      if (resource.disabled || !isProjectSpaceResource(resource)) {
        continue
      }
      await duplicateSpace(resource)
    }
  }

  const actions = computed((): SpaceAction[] => [
    {
      name: 'duplicate',
      icon: 'folders',
      label: () => $gettext('Duplicate'),
      handler: (args) => loadingService.addTask(() => handler(args)),
      isVisible: ({ resources }) => {
        if (!resources?.length) {
          return false
        }

        if (resources.every((resource) => resource.disabled)) {
          return false
        }

        if (resources.some((resource) => !isProjectSpaceResource(resource))) {
          return false
        }

        return ability.can('create-all', 'Drive')
      },
      class: 'oc-files-actions-duplicate-trigger'
    }
  ])

  return {
    actions,
    duplicateSpace
  }
}
