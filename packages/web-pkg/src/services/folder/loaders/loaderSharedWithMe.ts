import { FolderLoader, FolderLoaderTask, TaskContext } from '../folderService'
import { Router } from 'vue-router'
import { useTask } from 'vue-concurrency'
import { buildIncomingShareResource, call } from '@opencloud-eu/web-client'
import { isLocationGuestActive, isLocationSharesActive } from '../../../router'
import { unref } from 'vue'

export class FolderLoaderSharedWithMe implements FolderLoader {
  public isEnabled(): boolean {
    return true
  }

  public isActive(router: Router): boolean {
    const currentRoute = unref(router.currentRoute)
    return (
      isLocationSharesActive(router, 'files-shares-with-me') ||
      isLocationGuestActive(router, 'files-guest-shares') ||
      ['files-shares-with-me', 'files-guest-shares'].includes(
        currentRoute?.query?.contextRouteName as string
      )
    )
  }

  public getTask(context: TaskContext): FolderLoaderTask {
    const { clientService, configStore, resourcesStore, sharesStore } = context

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return useTask(function* (signal1, signal2) {
      resourcesStore.clearResourceList()
      resourcesStore.setAncestorMetaData({})

      const value = yield* call(
        clientService.graphAuthenticated.driveItems.listSharedWithMe(
          { expand: new Set(['thumbnails']) },
          { signal: signal1 }
        )
      )

      const resources = value.map((driveItem) =>
        buildIncomingShareResource({
          driveItem,
          graphRoles: sharesStore.graphRoles,
          serverUrl: configStore.serverUrl
        })
      )

      resourcesStore.initResourceList({ currentFolder: null, resources })
    })
  }
}
