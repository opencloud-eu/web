import { Ref, ref, unref, MaybeRef } from 'vue'
import { dirname } from 'path'
import { ClientService, folderService } from '../../services'
import { useAppFileHandling } from './useAppFileHandling'
import { isSearchResource, isShareSpaceResource, Resource } from '@opencloud-eu/web-client'
import { FileContext } from './types'
import { RouteLocationNormalizedLoaded } from 'vue-router'
import { useFileRouteReplace } from '../router/useFileRouteReplace'
import { DavProperty } from '@opencloud-eu/web-client/webdav'
import { useAuthService } from '../authContext/useAuthService'
import { isMountPointSpaceResource } from '@opencloud-eu/web-client'
import { useExtensionRegistry, useResourcesStore, useSpacesStore } from '../piniaStores'
import { storeToRefs } from 'pinia'
import { useRouteQuery } from '../router'
import { useSearch } from '../search'
import {
  decryptResourceInPlace,
  markVaultStatus,
  resolveFolderVault
} from '../../helpers/folderVault'

interface AppFolderHandlingOptions {
  currentRoute: Ref<RouteLocationNormalizedLoaded>
  clientService?: ClientService
}

export interface AppFolderHandlingResult {
  isFolderLoading: Ref<boolean>
  activeFiles: Ref<Array<Resource>>

  loadFolderForFileContext(context: MaybeRef<FileContext>): Promise<void>
}

export function useAppFolderHandling({
  currentRoute,
  clientService
}: AppFolderHandlingOptions): AppFolderHandlingResult {
  const isFolderLoading = ref(false)
  const { webdav } = clientService
  const { replaceInvalidFileRoute } = useFileRouteReplace()
  const { getFileInfo } = useAppFileHandling({ clientService })
  const authService = useAuthService()
  const spacesStore = useSpacesStore()
  const { buildSearchTerm, search } = useSearch()
  const currentRouteQuery = useRouteQuery('contextRouteQuery')

  const resourcesStore = useResourcesStore()
  const extensionRegistry = useExtensionRegistry()
  const { activeResources } = storeToRefs(resourcesStore)

  const loadFolderForFileContext = async (context: MaybeRef<FileContext>) => {
    isFolderLoading.value = true

    try {
      context = unref(context)

      if ((unref(currentRouteQuery) as any)?.term) {
        // run search query to load all results
        // TODO: add filters from query params
        const searchTerm = buildSearchTerm({ term: (unref(currentRouteQuery) as any)?.term })
        const { values } = await search(searchTerm, 200)
        const resources = values
          .filter(({ data }) => isSearchResource(data as Resource))
          .map<Resource>((v) => v.data as Resource)

        resourcesStore.initResourceList({ currentFolder: null, resources })
        isFolderLoading.value = false
        return
      }

      const flatFileLists = [
        'files-shares-with-me',
        'files-shares-with-others',
        'files-shares-via-link',
        'files-common-favorites'
      ]

      if (flatFileLists.includes(unref(context.routeName))) {
        // use the folder loader to load the resources for flat file lists
        const loaderTask = folderService.getTask()
        await loaderTask.perform()
        isFolderLoading.value = false
        return
      }

      resourcesStore.clearResourceList()
      const space = unref(context.space)
      // FIXME(poc-vault): this app-open path duplicates a chunk of the
      // loaderSpace flow. The vault-decrypt steps below should move into a
      // shared layer once we lift vault-awareness out of every caller.
      const vaultEngine = resolveFolderVault(extensionRegistry, space, unref(context.item))
      const baseCtx = unref(context)
      const fetchCtx = vaultEngine
        ? { ...baseCtx, item: await vaultEngine.encryptPath(unref(baseCtx.item)) }
        : context
      const pathResource = await getFileInfo(fetchCtx, {
        davProperties: [DavProperty.FileId]
      })
      if (vaultEngine) {
        await decryptResourceInPlace(vaultEngine, pathResource)
      }
      replaceInvalidFileRoute({
        space,
        resource: pathResource,
        path: unref(context.item),
        fileId: unref(context.itemId)
      })

      const isSpaceRoot = spacesStore.spaces.some(
        (s) => isMountPointSpaceResource(s) && s.root.remoteItem?.id === pathResource.id
      )

      if (isSpaceRoot) {
        const resource = await getFileInfo(context)
        if (vaultEngine) {
          await decryptResourceInPlace(vaultEngine, resource)
        }
        markVaultStatus(extensionRegistry, space, [resource])
        resourcesStore.initResourceList({ currentFolder: resource, resources: [resource] })
        isFolderLoading.value = false
        return
      }

      const cleartextParentPath = dirname(pathResource.path)
      const listPath = vaultEngine
        ? await vaultEngine.encryptPath(cleartextParentPath)
        : cleartextParentPath
      const { resource, children } = await webdav.listFiles(space, {
        path: listPath
      })
      if (vaultEngine) {
        // Parent + children decrypt in parallel — calls only touch their own
        // resource, so listings of N items finish in ~one round-trip
        // instead of N.
        await Promise.all([
          decryptResourceInPlace(vaultEngine, resource),
          ...children.map((c) => decryptResourceInPlace(vaultEngine, c))
        ])
      }
      markVaultStatus(extensionRegistry, space, [resource, ...children])

      if (isShareSpaceResource(space)) {
        children.forEach((r) => (r.remoteItemId = space.id))
      }

      if (resource.type === 'file') {
        resourcesStore.initResourceList({
          // FIXME: currentFolder should be null?!
          currentFolder: resource,
          resources: [resource]
        })
      } else {
        resourcesStore.initResourceList({ currentFolder: resource, resources: children })
      }
    } catch (error) {
      if (error.statusCode === 401) {
        return authService.handleAuthError(unref(currentRoute))
      }
      resourcesStore.setCurrentFolder(null)
      console.error(error)
    }
    isFolderLoading.value = false
  }

  return {
    isFolderLoading,
    loadFolderForFileContext,
    activeFiles: activeResources
  }
}
