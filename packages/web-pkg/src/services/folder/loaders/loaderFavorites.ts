import { FolderLoader, FolderLoaderTask, TaskContext } from '../folderService'
import { Router } from 'vue-router'
import { useTask } from 'vue-concurrency'
import { buildResource } from '@opencloud-eu/web-client'
import { isLocationCommonActive } from '../../../router'
import { unref } from 'vue'

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
    const { resourcesStore, clientService } = context

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return useTask(function* (signal1) {
      resourcesStore.clearResourceList()
      resourcesStore.setAncestorMetaData({})

      let resources = yield clientService.webdav.listFavoriteFiles({
        signal: signal1
      })

      resources = resources.map(buildResource)
      resourcesStore.initResourceList({ currentFolder: null, resources })
    })
  }
}
