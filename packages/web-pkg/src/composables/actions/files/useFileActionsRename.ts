import { isSameResource, renameResource as _renameResource } from '../../../helpers/resource'
import { isLocationSharesActive, isLocationTrashActive } from '../../../router'
import {
  extractNameWithoutExtension,
  isShareSpaceResource,
  Resource,
  SpaceResource
} from '@opencloud-eu/web-client'
import { dirname, join } from 'path'
import { WebDAV } from '@opencloud-eu/web-client/webdav'
import { createFileRouteOptions } from '../../../helpers/router'
import { computed } from 'vue'
import { useClientService } from '../../clientService'
import { useRouter } from '../../router'
import { useGettext } from 'vue3-gettext'
import { FileAction, FileActionOptions } from '../types'
import {
  useCapabilityStore,
  useConfigStore,
  useMessages,
  useModals,
  useResourcesStore,
  useUserStore
} from '../../piniaStores'
import { useAbility } from '../../ability'
import { useIsResourceNameValid } from '../helpers'

export const useFileActionsRename = () => {
  const { showErrorMessage } = useMessages()
  const capabilityStore = useCapabilityStore()
  const router = useRouter()
  const { $gettext } = useGettext()
  const clientService = useClientService()
  const configStore = useConfigStore()
  const { dispatchModal } = useModals()
  const userStore = useUserStore()
  const ability = useAbility()

  const resourcesStore = useResourcesStore()
  const { setCurrentFolder, upsertResource } = resourcesStore
  const { isFileNameValid } = useIsResourceNameValid()

  const renameResource = async (space: SpaceResource, resource: Resource, newName: string) => {
    let currentFolder = resourcesStore.currentFolder

    try {
      const newPath = join(dirname(resource.path), newName)
      await (clientService.webdav as WebDAV).moveFiles(space, resource, space, {
        path: newPath
      })

      const isCurrentFolder = isSameResource(resource, currentFolder)

      if (isShareSpaceResource(space) && resource.isReceivedShare()) {
        space.rename(newName)

        if (isCurrentFolder) {
          currentFolder = { ...currentFolder } as Resource
          currentFolder.name = newName
          setCurrentFolder(currentFolder)
          return router.push(
            createFileRouteOptions(space, {
              path: '',
              fileId: resource.fileId
            })
          )
        }

        const sharedResource = { ...resource }
        sharedResource.name = newName
        upsertResource(sharedResource)
        return
      }

      if (isCurrentFolder) {
        currentFolder = { ...currentFolder } as Resource
        _renameResource(space, currentFolder, newPath)
        setCurrentFolder(currentFolder)
        return router.push(
          createFileRouteOptions(space, {
            path: newPath,
            fileId: resource.fileId
          })
        )
      }
      const fileResource = { ...resource } as Resource
      _renameResource(space, fileResource, newPath)
      upsertResource(fileResource)
    } catch (error) {
      console.error(error)
      let title = $gettext(
        'Failed to rename "%{file}" to »%{newName}«',
        { file: resource.name, newName },
        true
      )
      if (error.statusCode === 423) {
        title = $gettext(
          'Failed to rename »%{file}« to »%{newName}« - the file is locked',
          { file: resource.name, newName },
          true
        )
      }
      showErrorMessage({ title, errors: [error] })
    }
  }

  const handler = async ({ space, resources }: FileActionOptions) => {
    const currentFolder = resourcesStore.currentFolder
    let parentResources: Resource[]
    if (isSameResource(resources[0], currentFolder)) {
      const parentPath = dirname(currentFolder.path)
      parentResources = (await clientService.webdav.listFiles(space, { path: parentPath })).children
    }

    const areFileExtensionsShown = resourcesStore.areFileExtensionsShown
    const onConfirm = async (newName: string) => {
      if (!areFileExtensionsShown) {
        newName = `${newName}.${resources[0].extension}`
      }

      await renameResource(space, resources[0], newName)
    }
    const checkName = (newName: string, setError: (error: string) => void) => {
      if (!areFileExtensionsShown) {
        newName = `${newName}.${resources[0].extension}`
      }

      const { isValid, error } = isFileNameValid(resources[0], newName, parentResources)
      setError(isValid ? null : error)
    }
    const nameWithoutExtension = extractNameWithoutExtension(resources[0])
    const modalTitle =
      !resources[0].isFolder && !areFileExtensionsShown ? nameWithoutExtension : resources[0].name

    const title = resources[0].isFolder
      ? $gettext('Rename folder »%{name}«', { name: modalTitle })
      : $gettext('Rename file »%{name}«', { name: modalTitle })

    const inputValue =
      !resources[0].isFolder && !areFileExtensionsShown ? nameWithoutExtension : resources[0].name

    const inputSelectionRange =
      resources[0].isFolder || !areFileExtensionsShown
        ? null
        : ([0, nameWithoutExtension.length] as [number, number])

    dispatchModal({
      title,
      confirmText: $gettext('Rename'),
      hasInput: true,
      inputValue,
      inputSelectionRange,
      inputLabel: resources[0].isFolder ? $gettext('Folder name') : $gettext('File name'),
      inputRequiredMark: true,
      onConfirm,
      onInput: checkName
    })
  }

  const actions = computed((): FileAction[] => [
    {
      name: 'rename',
      icon: 'pencil',
      label: () => {
        return $gettext('Rename')
      },
      handler,
      isVisible: ({ resources }) => {
        if (isLocationTrashActive(router, 'files-trash-generic')) {
          return false
        }
        if (
          isLocationSharesActive(router, 'files-shares-with-me') &&
          !capabilityStore.sharingCanRename
        ) {
          return false
        }
        if (resources.length !== 1) {
          return false
        }

        // FIXME: Remove this check as soon as renaming shares works as expected.
        // Might be the case? Needs to be retested.
        const rootShareIncluded = configStore.options.routing.fullShareOwnerPaths
          ? resources.some((r) => r.remoteItemPath && r.path)
          : resources.some((r) => r.remoteItemId && r.path === '/')
        if (rootShareIncluded) {
          return false
        }

        if (resources.length === 1 && resources[0].locked) {
          return false
        }

        const renameDisabled = resources.some((resource) => {
          return !resource.canRename({ user: userStore.user, ability }) || resource.processing
        })
        return !renameDisabled
      },
      class: 'oc-files-actions-rename-trigger'
    }
  ])

  return {
    actions,
    renameResource
  }
}
