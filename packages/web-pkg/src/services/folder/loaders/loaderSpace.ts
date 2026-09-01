import { FolderLoader, FolderLoaderTask, TaskContext } from '../folderService'
import { Router } from 'vue-router'
import { useTask } from 'vue-concurrency'
import {
  buildIncomingShareResource,
  call,
  isPersonalSpaceResource,
  isProjectSpaceResource,
  isPublicSpaceResource,
  isShareSpaceResource,
  SpaceResource
} from '@opencloud-eu/web-client'
import { unref } from 'vue'
import { FolderLoaderOptions } from './types'
import { DriveItem } from '@opencloud-eu/web-client/graph/generated'
import { buildResourcesFromDriveItems } from '@opencloud-eu/web-client'
import { isLocationSpacesActive, isLocationPublicActive } from '../../../router'
import { getSharedDriveItem, setCurrentUserShareSpacePermissions } from '../../../helpers'
import { useFileRouteReplace } from '../../../composables'
import { DavProperties, DavProperty } from '@opencloud-eu/web-client/webdav'

export class FolderLoaderSpace implements FolderLoader {
  public isEnabled(): boolean {
    return true
  }

  public isActive(router: Router): boolean {
    // TODO: remove next check when isLocationSpacesActive doesn't return true for generic route when being on projects overview.
    if (isLocationSpacesActive(router, 'files-spaces-projects')) {
      return false
    }
    return (
      isLocationSpacesActive(router, 'files-spaces-generic') ||
      isLocationPublicActive(router, 'files-public-link')
    )
  }

  public getTask(context: TaskContext): FolderLoaderTask {
    const {
      router,
      clientService,
      resourcesStore,
      authService,
      spacesStore,
      sharesStore,
      configStore
    } = context
    const { webdav, graphAuthenticated: graphClient } = clientService
    const { replaceInvalidFileRoute } = useFileRouteReplace({ router })

    return useTask(function* (
      signal1,
      signal2,
      space: SpaceResource,
      path: string = null,
      fileId: string = null,
      options: FolderLoaderOptions = {}
    ) {
      try {
        resourcesStore.clearResourceList()

        const davProperties = DavProperties.Default
        if (isPublicSpaceResource(space)) {
          // needed for public links for make previews work
          davProperties.push(DavProperty.DownloadURL)
        }

        // Graph listing is opt-in while it is being validated against PROPFIND,
        // toggle with localStorage.setItem('oc_graph_listing', '1').
        const useGraphListing =
          !isPublicSpaceResource(space) &&
          (() => {
            try {
              return window.localStorage.getItem('oc_graph_listing') === '1'
            } catch {
              return false
            }
          })()

        // eslint-disable-next-line prefer-const
        let { resource: currentFolder, children: resources } = yield* call(
          useGraphListing
            ? listFilesViaGraph({ graphClient, webdav, space, path, fileId, signal: signal1 })
            : webdav.listFiles(space, { path, fileId }, { signal: signal1, davProperties })
        )

        // if current folder has no id (= singe file public link) we must not correct the route
        if (currentFolder.id) {
          replaceInvalidFileRoute({ space, resource: currentFolder, path, fileId })
        }

        let sharedDriveItem: DriveItem

        if (path === '/') {
          if (isShareSpaceResource(space)) {
            sharedDriveItem = yield* call(
              getSharedDriveItem({ graphClient, spacesStore, space, signal: signal1 })
            )
            if (sharedDriveItem) {
              currentFolder = buildIncomingShareResource({
                graphRoles: sharesStore.graphRoles,
                driveItem: sharedDriveItem,
                serverUrl: configStore.serverUrl
              })
            }
          } else if (!isPersonalSpaceResource(space) && !isPublicSpaceResource(space)) {
            // note: in the future we might want to show the space as root for personal spaces as well (to show quota and the like). Currently not needed.
            currentFolder = space
          }
        }

        yield resourcesStore.loadAncestorMetaData({
          folder: currentFolder,
          space,
          client: webdav,
          signal: signal1
        })

        if (isProjectSpaceResource(space)) {
          yield spacesStore.loadGraphPermissions({ ids: [space.id], graphClient })
        }

        if (isShareSpaceResource(space)) {
          // TODO: remove when server returns share id for federated shares in propfind response
          resources.forEach((r) => (r.remoteItemId = space.id))

          // load graph permissions if not already loaded
          if (space.graphPermissions === undefined) {
            if (!sharedDriveItem) {
              sharedDriveItem = yield* call(
                getSharedDriveItem({ graphClient, spacesStore, space, signal: signal1 })
              )
            }
            setCurrentUserShareSpacePermissions({
              sharesStore,
              spacesStore,
              space,
              sharedDriveItem
            })
          }
        }

        resourcesStore.initResourceList({ currentFolder, resources })
      } catch (error) {
        resourcesStore.setCurrentFolder(null)
        console.error(error)

        if (error.statusCode === 401) {
          return authService.handleAuthError(unref(router.currentRoute))
        }
      }
    }).restartable()
  }
}

// listFilesViaGraph lists a folder through the graph children endpoint. The
// current folder still comes from webdav: graph has no "stat this item" in the
// listing call, and the loader needs it for the route correction.
const listFilesViaGraph = async ({
  graphClient,
  webdav,
  space,
  path,
  fileId,
  signal
}: {
  graphClient: any
  webdav: any
  space: SpaceResource
  path: string
  fileId: string
  signal: AbortSignal
}) => {
  const { resource: currentFolder } = await webdav.listFiles(
    space,
    { path, fileId },
    { depth: 0, signal }
  )

  const driveItems = await graphClient.driveItems.listDriveItemChildren(
    space.id.toString(),
    currentFolder.id.toString(),
    {
      select: [
        '@libre.graph.permissions.actions.allowedValues',
        '@libre.graph.shareTypes'
      ]
    },
    { signal }
  )

  return {
    resource: currentFolder,
    children: buildResourcesFromDriveItems(driveItems, space, currentFolder.path)
  }
}
