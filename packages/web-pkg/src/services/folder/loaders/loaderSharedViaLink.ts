import { FolderLoader, FolderLoaderTask, TaskContext } from '../folderService'
import { Router } from 'vue-router'
import { useTask } from 'vue-concurrency'
import { isLocationSharesActive } from '../../../router'
import { buildOutgoingShareResource, call } from '@opencloud-eu/web-client'
import { unref } from 'vue'

export class FolderLoaderSharedViaLink implements FolderLoader {
  public isEnabled(): boolean {
    return true
  }

  public isActive(router: Router): boolean {
    const currentRoute = unref(router.currentRoute)
    return (
      isLocationSharesActive(router, 'files-shares-via-link') ||
      currentRoute?.query?.contextRouteName === 'files-shares-via-link'
    )
  }

  public getTask(context: TaskContext): FolderLoaderTask {
    const { userStore, clientService, configStore, resourcesStore, spacesStore } = context

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return useTask(function* (signal1, signal2) {
      resourcesStore.clearResourceList()
      resourcesStore.setAncestorMetaData({})

      const value = yield* call(
        clientService.graphAuthenticated.driveItems.listSharedByMe(
          { expand: new Set(['thumbnails']) },
          { signal: signal1 }
        )
      )

      const resources = value
        .filter((s) => s.permissions.some(({ link }) => !!link))
        .map((driveItem) => {
          const resource = buildOutgoingShareResource({
            driveItem,
            user: userStore.user,
            serverUrl: configStore.serverUrl
          })
          const space =
            driveItem.root &&
            spacesStore.spaces.find(({ id }) => id === driveItem.parentReference?.driveId)
          if (!space) {
            return resource
          }

          // a link on a space root is listed as the space, so it looks and opens like in the spaces list
          const { sharedWith, sharedBy, sdate, shareTypes, outgoing } = resource
          return { ...space, sharedWith, sharedBy, sdate, shareTypes, outgoing }
        })

      resourcesStore.initResourceList({ currentFolder: null, resources })
    })
  }
}
