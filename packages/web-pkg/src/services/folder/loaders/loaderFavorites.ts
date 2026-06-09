import { FolderLoader, FolderLoaderTask, TaskContext } from '../folderService'
import { Router } from 'vue-router'
import { useTask } from 'vue-concurrency'
import { isLocationCommonActive } from '../../../router'
import { unref } from 'vue'
import { Resource } from '@opencloud-eu/web-client'
import { getVaultClaim, markVaultStatus } from '../../../helpers/folderVault'

export class FolderLoaderFavorites implements FolderLoader {
  public isEnabled(): boolean {
    return true
  }

  public isActive(router: Router): boolean {
    const currentRoute = unref(router.currentRoute)
    return (
      isLocationCommonActive(router, 'files-common-favorites') ||
      currentRoute?.query?.contextRouteName === 'files-common-favorites'
    )
  }

  public getTask(context: TaskContext): FolderLoaderTask {
    const { resourcesStore, clientService, spacesStore, extensionRegistry } = context

    const findSpaceById = (storageId: string) => spacesStore.spaces.find((s) => s.id === storageId)

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return useTask(function* (signal1, signal2) {
      resourcesStore.clearResourceList()
      resourcesStore.setAncestorMetaData({})

      const { resources } = yield clientService.webdav.search('is:favorite', {
        searchLimit: null,
        signal: signal1
      })

      // Favorites lists results from webdav.search, and the vault-aware webdav
      // client does NOT wrap search - so these resources arrive raw, without the
      // decrypt + isInVault flag a normal folder listing gets. Same policy as
      // useSearch:
      //   - drop encrypted vault *content* (ciphertext name, useless to show and
      //     unmatchable), but
      //   - KEEP the vault *root* (clear-text name, so users can find/favorite
      //     their vault) and flag it so the share/copy/move guards engage and it
      //     can't be public-linked or copied out from here.
      const visible = (resources as Resource[]).filter((resource) => {
        const space = findSpaceById(resource.storageId)
        const claim = space ? getVaultClaim(extensionRegistry, space, resource.path) : null
        return !claim?.encryptsNames || claim.vaultRoot === resource.path
      })
      for (const resource of visible) {
        const space = findSpaceById(resource.storageId)
        if (space) {
          markVaultStatus(extensionRegistry, space, [resource])
        }
      }

      resourcesStore.initResourceList({ currentFolder: null, resources: visible })
    })
  }
}
