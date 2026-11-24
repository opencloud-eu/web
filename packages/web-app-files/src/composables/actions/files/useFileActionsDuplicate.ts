import PQueue from 'p-queue'
import {
  Resource,
  dirname,
  isProjectSpaceResource,
  isShareSpaceResource,
  urlJoin
} from '@opencloud-eu/web-client'
import { storeToRefs } from 'pinia'
import { computed, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import {
  FileAction,
  FileActionOptions,
  resolveFileNameDuplicate,
  useClientService,
  useConfigStore,
  useLoadingService,
  useMessages,
  useResourcesStore
} from '@opencloud-eu/web-pkg'

export function useFileActionsDuplicate() {
  const clientService = useClientService()
  const configStore = useConfigStore()
  const loadingService = useLoadingService()
  const resourcesStore = useResourcesStore()
  const { currentFolder } = storeToRefs(resourcesStore)
  const { showMessage, showErrorMessage } = useMessages()
  const { $gettext, $ngettext } = useGettext()

  async function duplicateFiles({ space, resources = [] }: FileActionOptions) {
    if (!resources.length) {
      return
    }

    const duplicateQueue = new PQueue({
      concurrency: configStore.options.concurrentRequests.resourceBatchActions
    })
    const errors: Error[] = []
    const duplicatedResources: Resource[] = []
    const existingResourcesByPath = new Map<string, Resource[]>()
    const originalCurrentFolderId = unref(currentFolder)?.id

    const duplicationTargets: Array<{ source: Resource; path: string }> = []
    for (const resource of resources) {
      const parentPath = dirname(resource.path)
      let existingResources = existingResourcesByPath.get(parentPath)

      try {
        if (!existingResources) {
          existingResources = (await clientService.webdav.listFiles(space, { path: parentPath }))
            .children
          existingResourcesByPath.set(parentPath, existingResources)
        }

        const duplicatedName = resolveFileNameDuplicate(
          resource.name,
          resource.extension ?? '',
          existingResources
        )
        existingResources.push({ name: duplicatedName } as Resource)

        duplicationTargets.push({
          source: resource,
          path: urlJoin(parentPath, duplicatedName)
        })
      } catch (error) {
        console.error(error)
        errors.push(error as Error)
      }
    }

    await Promise.all(
      duplicationTargets.map(({ source, path }) =>
        duplicateQueue.add(async () => {
          try {
            await clientService.webdav.copyFiles(space, source, space, { path })
          } catch (error) {
            console.error(error)
            errors.push(error as Error)
            return
          }

          try {
            duplicatedResources.push(await clientService.webdav.getFileInfo(space, { path }))
          } catch (error) {
            // copy succeeded, only the file list update is skipped
            console.error(error)
          }
        })
      )
    )

    if (isShareSpaceResource(space)) {
      duplicatedResources.forEach((resource) => {
        resource.remoteItemId = space.id
      })
    }

    if (duplicatedResources.length && originalCurrentFolderId === unref(currentFolder)?.id) {
      const currentFolderPath = unref(currentFolder)?.path
      resourcesStore.upsertResources(
        duplicatedResources.filter((resource) => dirname(resource.path) === currentFolderPath)
      )
    }

    if (errors.length) {
      showErrorMessage({
        title: $ngettext(
          'Failed to duplicate the selected resource',
          'Failed to duplicate the selected resources',
          resources.length
        ),
        errors
      })
      return
    }

    resourcesStore.resetSelection()
    const title =
      resources.length === 1
        ? $gettext('"%{item}" was duplicated successfully', { item: resources[0].name })
        : $ngettext(
            '%{itemCount} item was duplicated successfully',
            '%{itemCount} items were duplicated successfully',
            resources.length,
            { itemCount: resources.length.toString() }
          )
    showMessage({ title })
  }

  const actions = computed((): FileAction[] => [
    {
      name: 'duplicate',
      icon: 'folders',
      handler: (args) => loadingService.addTask(() => duplicateFiles(args)),
      label: () => $gettext('Duplicate'),
      isVisible: ({ resources = [] }) => {
        if (!resources.length) {
          return false
        }

        const folder = unref(currentFolder)
        if (!folder?.canCreate()) {
          return false
        }

        // copies land next to the source, so it must live directly in the (writable) current folder
        if (
          resources.some(
            (resource) => resource.path === '/' || dirname(resource.path) !== folder.path
          )
        ) {
          return false
        }

        if (resources.some((resource) => isProjectSpaceResource(resource))) {
          return false
        }

        return resources.every((resource) => resource.canDownload())
      },
      class: 'oc-files-actions-duplicate-trigger'
    }
  ])

  return {
    actions,
    duplicateFiles
  }
}
