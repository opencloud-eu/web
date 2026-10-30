import { basename, dirname } from 'path'

import {
  Resource,
  isProjectSpaceResource,
  extractExtensionFromFile,
  SpaceResource,
  isTrashResource,
  urlJoin
} from '@opencloud-eu/web-client'
import { computed, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { FileAction, FileActionOptions } from '@opencloud-eu/web-pkg'
import {
  useMessages,
  useSpacesStore,
  useUserStore,
  useResourcesStore,
  useExtensionRegistry,
  encryptFolderPathsForServer,
  encryptResourcePathsForServer,
  getTextByteSize,
  getVaultNameMaxBytes,
  getVaultClaim,
  resolveVaultEngine,
  useRestoreWorker,
  useRouter,
  useClientService,
  ResolveStrategy,
  ResolveConflict,
  resolveFileNameDuplicate,
  ConflictDialog
} from '@opencloud-eu/web-pkg'

export const useFileActionsRestore = ({
  showSuccessMessage = true,
  onRestoreComplete
}: {
  showSuccessMessage?: boolean
  onRestoreComplete?: (result: FileActionOptions) => void
} = {}) => {
  const { showMessage, showErrorMessage } = useMessages()
  const userStore = useUserStore()
  const router = useRouter()
  const { $gettext, $ngettext } = useGettext()
  const clientService = useClientService()
  const spacesStore = useSpacesStore()
  const resourcesStore = useResourcesStore()
  const extensionRegistry = useExtensionRegistry()
  const { startWorker } = useRestoreWorker()

  // FIXME: use ConflictDialog class for this
  const collectConflicts = async (space: SpaceResource, sortedResources: Resource[]) => {
    const existingResourcesCache: Record<string, Resource[]> = {}
    const conflicts: Resource[] = []
    // same path as an earlier resource of the batch, the user wants both restored
    const batchDuplicates: Resource[] = []
    const collectedPaths = new Set<string>()
    const resolvedResources: Resource[] = []
    const missingFolderPaths: string[] = []
    const batchFolderPaths = new Set(
      sortedResources.filter(({ isFolder }) => isFolder).map(({ path }) => path)
    )
    for (const resource of sortedResources) {
      const parentPath = dirname(resource.path)

      let existingResources: Resource[] = []
      if (parentPath in existingResourcesCache) {
        existingResources = existingResourcesCache[parentPath]
      } else {
        try {
          existingResources = (
            await clientService.webdav.listFiles(space, {
              path: parentPath
            })
          ).children
        } catch {
          missingFolderPaths.push(parentPath)
        }
        existingResourcesCache[parentPath] = existingResources
      }
      if (collectedPaths.has(resource.path)) {
        batchDuplicates.push(resource)
        continue
      }
      collectedPaths.add(resource.path)
      // Compare by path segment, it matches the listing for locked vaults where the name stays cleartext
      const hasConflict = existingResources.some((r) => r.name === basename(resource.path))
      if (hasConflict) {
        conflicts.push(resource)
      } else {
        resolvedResources.push(resource)
      }
    }
    return {
      existingResourcesByPath: existingResourcesCache,
      conflicts,
      batchDuplicates,
      resolvedResources,
      // a folder restored by the same batch must not be created as a new empty one
      missingFolderPaths: missingFolderPaths.filter((path) => !batchFolderPaths.has(path))
    }
  }

  // Keeping both would write a cleartext name into a locked vault
  const canKeepBoth = async (space: SpaceResource, resource: Resource) => {
    const claim = getVaultClaim(extensionRegistry, space, resource.path)
    if (!claim?.encryptsNames || claim.vaultRoot === resource.path) {
      return true
    }
    return !!(await resolveVaultEngine(extensionRegistry, space, resource.path))
  }

  // FIXME: use ConflictDialog class for this
  const collectResolveStrategies = async (
    space: SpaceResource,
    conflicts: Resource[],
    existingResourcesByPath: Record<string, Resource[]>
  ) => {
    const resolvedConflicts = []
    let doForAllConflicts = false
    let allConflictsStrategy: ResolveStrategy
    for (const [index, conflict] of conflicts.entries()) {
      const isFolder = conflict.type === 'folder'
      const keepBothAllowed = await canKeepBoth(space, conflict)
      if (
        doForAllConflicts &&
        (keepBothAllowed || allConflictsStrategy !== ResolveStrategy.KEEP_BOTH)
      ) {
        resolvedConflicts.push({
          resource: conflict,
          strategy: allConflictsStrategy
        })
        continue
      }
      const remainingConflictCount = conflicts.length - index
      const existingResource = existingResourcesByPath[dirname(conflict.path)]?.find(
        (r) => r.name === basename(conflict.path)
      )
      const conflictDialog = new ConflictDialog($gettext, $ngettext)
      const resolvedConflict: ResolveConflict = await conflictDialog.resolveFileExists(
        { name: conflict.name, isFolder } as Resource,
        remainingConflictCount,
        false,
        false,
        existingResource ? existingResource.isFolder : isFolder,
        !keepBothAllowed
      )
      if (resolvedConflict.doForAllConflicts) {
        doForAllConflicts = true
        allConflictsStrategy = resolvedConflict.strategy
      }
      resolvedConflicts.push({
        resource: conflict,
        strategy: resolvedConflict.strategy
      })
    }
    return resolvedConflicts
  }

  const restoreResources = (
    space: SpaceResource,
    resources: Resource[],
    missingFolderPaths: string[],
    overwriteIds: string[] = []
  ) => {
    const originalRoute = unref(router.currentRoute)

    const workerData = { space, resources, missingFolderPaths, overwriteIds }
    startWorker(workerData, async ({ successful, failed }) => {
      if (successful.length) {
        let title: string
        if (successful.length === 1) {
          title = $gettext('%{resource} was restored successfully', {
            resource: successful[0].name
          })
        } else {
          title = $gettext('%{resourceCount} files restored successfully', {
            resourceCount: successful.length.toString()
          })
        }

        if (showSuccessMessage) {
          showMessage({ title })
        }

        // user hasn't navigated to another location meanwhile
        if (
          originalRoute.name === unref(router.currentRoute).name &&
          originalRoute.query?.fileId === unref(router.currentRoute).query?.fileId
        ) {
          resourcesStore.removeResources(successful)
          resourcesStore.resetSelection()
        }

        // Reload quota
        const graphClient = clientService.graphAuthenticated
        const updatedSpace = await graphClient.drives.getDrive(space.id)
        spacesStore.updateSpaceField({
          id: updatedSpace.id,
          field: 'spaceQuota',
          value: updatedSpace.spaceQuota
        })
        onRestoreComplete?.({ space, resources: successful })
      }

      if (failed.length) {
        let translated: string
        if (failed.length === 1) {
          translated = $gettext('Failed to restore "%{resource}"', {
            resource: failed[0].resource.name
          })
        } else {
          translated = $gettext('Failed to restore %{resourceCount} files', {
            resourceCount: failed.length.toString()
          })
        }
        showErrorMessage({ title: translated, errors: failed.map(({ error }) => error) })
      }
    })
  }

  const handler = async ({ space, resources }: FileActionOptions) => {
    // parents first, so conflicts are asked top-down
    const sortedResources = resources.sort((a, b) => a.path.length - b.path.length)

    // collect and request existing files in associated parent folders of each resource
    const {
      existingResourcesByPath,
      conflicts,
      batchDuplicates,
      resolvedResources,
      missingFolderPaths
    } = await collectConflicts(space, sortedResources)

    // iterate through conflicts and collect resolve strategies
    const resolvedConflicts = await collectResolveStrategies(
      space,
      conflicts,
      existingResourcesByPath
    )

    // iterate through conflicts and behave according to strategy
    const filesToOverwrite = resolvedConflicts
      .filter((e) => e.strategy === ResolveStrategy.REPLACE)
      .map((e) => e.resource)
    resolvedResources.push(...filesToOverwrite)
    // only explicit replaces may overwrite, anything else fails instead of silently replacing
    const overwriteIds = filesToOverwrite.map(({ id }) => id)
    const filesToKeepBoth = resolvedConflicts
      .filter((e) => e.strategy === ResolveStrategy.KEEP_BOTH)
      .map((e) => e.resource)
    // a duplicate follows the choice made for the first item at its path
    const restoredPaths = new Set(
      [...resolvedResources, ...filesToKeepBoth].map(({ path }) => path)
    )
    const duplicatesNotRestorable: string[] = []
    for (const resource of batchDuplicates) {
      if (!restoredPaths.has(resource.path)) {
        continue
      }
      if (await canKeepBoth(space, resource)) {
        filesToKeepBoth.push(resource)
      } else {
        duplicatesNotRestorable.push(resource.name)
      }
    }

    const namesTooLong: string[] = []
    for (let resource of filesToKeepBoth) {
      resource = { ...resource }
      const parentPath = dirname(resource.path)
      const existingResources = existingResourcesByPath[parentPath] || []
      const extension = extractExtensionFromFile(resource)
      const resolvedName = resolveFileNameDuplicate(resource.name, extension, [
        ...existingResources,
        ...resolvedConflicts.map((e) => e.resource),
        ...resolvedResources
      ])
      // the duplicate suffix can push a name past the vault limit
      const maxNameBytes = getVaultNameMaxBytes(extensionRegistry, space, parentPath)
      if (maxNameBytes && getTextByteSize(resolvedName) > maxNameBytes) {
        namesTooLong.push(resource.name)
        continue
      }
      resource.name = resolvedName
      resource.path = urlJoin(parentPath, resolvedName)
      resolvedResources.push(resource)
    }

    if (namesTooLong.length) {
      showErrorMessage({
        title: $ngettext(
          'Name too long for an encrypted folder',
          'Names too long for an encrypted folder',
          namesTooLong.length
        ),
        desc: $ngettext(
          '»%{name}« could not be restored as a copy, its new name is too long.',
          '%{count} files could not be restored as a copy, their new names are too long.',
          namesTooLong.length,
          { name: namesTooLong[0], count: namesTooLong.length.toString() }
        )
      })
    }
    if (duplicatesNotRestorable.length) {
      showErrorMessage({
        title: $ngettext(
          'Duplicate name in an encrypted folder',
          'Duplicate names in an encrypted folder',
          duplicatesNotRestorable.length
        ),
        desc: $ngettext(
          '»%{name}« could not be restored, another restored item has the same name.',
          '%{count} items could not be restored, other restored items have the same names.',
          duplicatesNotRestorable.length,
          { name: duplicatesNotRestorable[0], count: duplicatesNotRestorable.length.toString() }
        )
      })
    }
    if (!resolvedResources.length) {
      return
    }

    // The restore worker runs a vanilla webdav client, so for an unlocked vault
    // the decrypted (cleartext) paths above would restore the blob under a
    // cleartext name and break the vault. Translate paths back to their on-server
    // encrypted form before handing them off (no-op outside vaults / for locked
    // vaults, where the path is already ciphertext).
    const resourcesForServer = await encryptResourcePathsForServer(
      extensionRegistry,
      space,
      resolvedResources
    )
    const foldersForServer = await encryptFolderPathsForServer(
      extensionRegistry,
      space,
      missingFolderPaths
    )

    return restoreResources(space, resourcesForServer, foldersForServer, overwriteIds)
  }

  const actions = computed((): FileAction[] => [
    {
      name: 'restore',
      icon: 'arrow-go-back',
      label: () => $gettext('Restore'),
      handler,
      isVisible: ({ space, resources }) => {
        if (!resources.every((r) => isTrashResource(r) && r.canBeRestored())) {
          return false
        }

        if (
          isProjectSpaceResource(space) &&
          !space.canRestoreFromTrashbin({ user: userStore.user })
        ) {
          return false
        }

        return resources.length > 0
      },
      class: 'oc-files-actions-restore-trigger'
    }
  ])

  return {
    actions,
    // HACK: exported for unit tests:
    restoreResources,
    collectConflicts
  }
}
