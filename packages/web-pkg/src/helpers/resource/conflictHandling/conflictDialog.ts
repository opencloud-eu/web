import { markRaw } from 'vue'
import { join } from 'path'
import { Resource } from '@opencloud-eu/web-client'
import { ResolveConflict, ResolveStrategy } from './types'
import { isSameResource } from '../sameResource'
import { useModals } from '../../../composables'
import SpaceMoveInfoModal from '../../../components/Modals/SpaceMoveInfoModal.vue'
import ResourceConflictModal from '../../../components/Modals/ResourceConflictModal.vue'
import type { Language } from 'vue3-gettext'

export interface FileConflict {
  resource: Resource
  existingResource?: Resource
  strategy?: ResolveStrategy
}

export class ConflictDialog {
  constructor(
    protected $gettext: Language['$gettext'],
    protected $ngettext: Language['$ngettext']
  ) {}

  /**
   * Asks the user how to resolve each name clash of the given resources in the target folder.
   * A resource clashes with an existing item of the target folder or with an earlier resource
   * of the same batch, because all of them end up in the same folder. Replacing is not offered
   * if it would overwrite another resource of the batch.
   * Closing a dialog stops asking, the last conflict then has the strategy CANCEL.
   */
  async resolveAllConflicts(
    resourcesToMove: Resource[],
    targetFolder: Resource,
    targetFolderResources: Resource[]
  ): Promise<FileConflict[]> {
    function findExistingResource(resource: Resource) {
      const targetFilePath = join(targetFolder.path, resource.name)
      return targetFolderResources.find((r) => r.path === targetFilePath)
    }

    // names that resources of this batch will take in the target folder, a resource without
    // a conflict is always the first one with its name
    const claimedNames = new Map<string, Resource>()
    const conflictingResources: Resource[] = []
    const batchNames = new Set<string>()
    for (const resource of resourcesToMove) {
      if (batchNames.has(resource.name) || findExistingResource(resource)) {
        conflictingResources.push(resource)
      } else {
        claimedNames.set(resource.name, resource)
      }
      batchNames.add(resource.name)
    }

    let doForAllConflicts = false
    let doForAllConflictsStrategy: ResolveStrategy = null
    const resolvedConflicts: FileConflict[] = []
    for (const [index, resource] of conflictingResources.entries()) {
      const existingResource = claimedNames.get(resource.name) || findExistingResource(resource)
      // replacing would overwrite another resource of this batch
      const canReplace = !resourcesToMove.some(
        (r) => r !== resource && isSameResource(r, existingResource)
      )

      let strategy = doForAllConflictsStrategy
      if (!doForAllConflicts || (strategy === ResolveStrategy.REPLACE && !canReplace)) {
        const result: ResolveConflict = await this.resolveFileExists(
          resource,
          conflictingResources.length - index,
          false,
          false,
          existingResource.isFolder,
          false,
          !canReplace
        )
        strategy = result.strategy

        // User checked 'do for all x conflicts'
        if (result.doForAllConflicts) {
          doForAllConflicts = true
          doForAllConflictsStrategy = result.strategy
        }
      }

      resolvedConflicts.push({ resource, existingResource, strategy })
      if (strategy === ResolveStrategy.CANCEL) {
        return resolvedConflicts
      }
      if (strategy === ResolveStrategy.REPLACE) {
        claimedNames.set(resource.name, resource)
      }
    }
    return resolvedConflicts
  }

  resolveFileExists(
    resource: Resource,
    conflictCount: number,
    suggestMerge = false,
    separateSkipHandling = false, // separate skip-handling between files and folders
    existingIsFolder = resource.isFolder,
    hideKeepBoth = false,
    hideReplace = false
  ): Promise<ResolveConflict> {
    const { dispatchModal } = useModals()

    return new Promise<ResolveConflict>((resolve) => {
      dispatchModal({
        title: existingIsFolder
          ? this.$gettext('Folder already exists')
          : this.$gettext('File already exists'),
        hideConfirmButton: true,
        showCancelAction: true,
        customComponent: markRaw(ResourceConflictModal),
        customComponentAttrs: () => ({
          resource,
          conflictCount,
          suggestMerge,
          separateSkipHandling,
          existingIsFolder,
          hideKeepBoth,
          hideSecondaryAction: hideReplace,
          callbackFn: (conflict: ResolveConflict) => {
            resolve(conflict)
          }
        })
      })
    })
  }

  resolveDoCopyInsteadOfMoveForSpaces(): Promise<boolean> {
    const { dispatchModal } = useModals()

    return new Promise<boolean>((resolve) => {
      dispatchModal({
        title: this.$gettext('Copy here?'),
        customComponent: markRaw(SpaceMoveInfoModal),
        confirmText: this.$gettext('Copy here'),
        onCancel: () => {
          resolve(false)
        },
        onConfirm: () => Promise.resolve(resolve(true))
      })
    })
  }
}
