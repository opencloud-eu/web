import { Ref, computed, ref, unref, watch } from 'vue'
import { DateTime } from 'luxon'
import { useTask } from 'vue-concurrency'
import { useRouter } from 'vue-router'
import { dirname } from 'path'
import {
  Resource,
  SpaceResource,
  buildIncomingShareResource,
  call,
  isPersonalSpaceResource,
  isShareSpaceResource
} from '@opencloud-eu/web-client'

import { useAppDefaults } from '../appDefaults'
import { queryItemAsString } from '../appDefaults/useAppNavigation'
import { useClientService } from '../clientService'
import { useGetResourceContext } from '../resources'
import { useRoute, useRouteParam, useRouteQuery } from '../router'
import { useSelectedResources } from '../selection'
import { useConfigStore, useResourcesStore, useSharesStore, useSpacesStore } from '../piniaStores'
import { getSharedDriveItem } from '../../helpers'

export interface UseRouteFileLoaderOptions {
  applicationId: string
  /**
   * When set and it returns a non-empty extension string, the resource is
   * copied to a sibling file with that extension and the route is replaced
   * to point at the copy (drawio-style import flows, e.g. .vsdx → .drawio).
   */
  importResourceWithExtension?: (resource: Resource) => string | null
}

/**
 * Resolves the resource to view/edit from the current vue-router route:
 * reads `driveAliasAndItem` / `fileId`, back-fills a clean route via
 * `useGetResourceContext` when only `fileId` is present, fetches file info,
 * and reconstructs an incoming-share resource via the Graph API where needed.
 * Re-exports the route-bound `useAppDefaults` helpers the host needs so the
 * latter can be wired into `useResourceEditor` without invoking
 * `useAppDefaults` a second time.
 */
export function useRouteFileLoader({
  applicationId,
  importResourceWithExtension
}: UseRouteFileLoaderOptions) {
  const router = useRouter()
  const currentRoute = useRoute()
  const clientService = useClientService()
  const { getResourceContext } = useGetResourceContext()
  const { selectedResources } = useSelectedResources()
  const spacesStore = useSpacesStore()
  const configStore = useConfigStore()
  const resourcesStore = useResourcesStore()
  const sharesStore = useSharesStore()

  const appDefaults = useAppDefaults({ applicationId })
  const {
    closeApp,
    currentFileContext,
    getFileInfo,
    replaceInvalidFileRoute,
    activeFiles,
    loadFolderForFileContext,
    isFolderLoading
  } = appDefaults

  const resource = ref<Resource>() as Ref<Resource | undefined>
  const space = ref<SpaceResource>() as Ref<SpaceResource | undefined>
  const loading = ref(true)
  const loadingError = ref<Error | null>(null)

  const driveAliasAndItem = useRouteParam('driveAliasAndItem')
  const fileIdQueryItem = useRouteQuery('fileId')
  const fileId = computed(() => queryItemAsString(unref(fileIdQueryItem)))

  // Search results open files via `?fileId=…` without a driveAliasAndItem.
  // Resolve drive+path via Graph and push a clean route; the watcher below
  // re-runs with the freshly populated param.
  const addMissingDriveAliasAndItem = async () => {
    const id = unref(fileId)
    const { space: ctxSpace, path } = await getResourceContext(id)
    const dai = ctxSpace.getDriveAliasAndItem({ path } as Resource)

    if (isPersonalSpaceResource(ctxSpace)) {
      return router.push({
        params: {
          ...unref(currentRoute).params,
          driveAliasAndItem: dai
        },
        query: {
          ...unref(currentRoute).query,
          fileId: id,
          contextRouteName: 'files-spaces-generic',
          contextRouteParams: { driveAliasAndItem: dirname(dai) } as any
        }
      })
    }

    return router.push({
      params: {
        ...unref(currentRoute).params,
        driveAliasAndItem: dai
      },
      query: {
        ...unref(currentRoute).query,
        fileId: id,
        contextRouteName: path === '/' ? 'files-shares-with-me' : 'files-spaces-generic',
        ...(isShareSpaceResource(ctxSpace) && { shareId: ctxSpace.id }),
        contextRouteParams: {
          driveAliasAndItem: dirname(dai)
        } as any,
        contextRouteQuery: {
          ...(isShareSpaceResource(ctxSpace) && { shareId: ctxSpace.id })
        } as any
      }
    })
  }

  const loadResourceTask = useTask(function* (signal) {
    try {
      loading.value = true
      loadingError.value = null

      if (!unref(driveAliasAndItem)) {
        yield addMissingDriveAliasAndItem()
      }
      space.value = unref(unref(currentFileContext).space)
      let fileInfo: Resource = yield getFileInfo(unref(currentFileContext), { signal })

      // webdav doesn't expose oc-remote-id on share roots; patch from the
      // space and overlay Graph driveItem fields when the resource is the
      // share root itself.
      if (isShareSpaceResource(unref(space))) {
        fileInfo.remoteItemId = unref(space)!.id

        if (fileInfo.id === fileInfo.remoteItemId) {
          const sharedDriveItem = yield* call(
            getSharedDriveItem({
              graphClient: clientService.graphAuthenticated,
              spacesStore,
              space: unref(space)!
            })
          )

          if (sharedDriveItem) {
            fileInfo = {
              ...fileInfo,
              ...buildIncomingShareResource({
                graphRoles: sharesStore.graphRoles,
                driveItem: sharedDriveItem,
                serverUrl: configStore.serverUrl
              }),
              tags: fileInfo.tags // Graph API returns []; keep webdav tags.
            }
          }
        }
      }

      const newExtension = importResourceWithExtension?.(fileInfo)
      if (newExtension) {
        const timestamp = DateTime.local().toFormat('yyyyMMddHHmmss')
        const targetPath = `${fileInfo.name}_${timestamp}.${newExtension}`
        if (
          !(yield clientService.webdav.copyFiles(
            unref(space)!,
            fileInfo,
            unref(space)!,
            { path: targetPath },
            { signal }
          ))
        ) {
          throw new Error('Importing failed')
        }
        fileInfo = { path: targetPath } as Resource
      }

      if (replaceInvalidFileRoute(currentFileContext, fileInfo)) {
        // The watcher will re-enter with the corrected path.
        return
      }

      resource.value = fileInfo
      resourcesStore.initResourceList({ currentFolder: null, resources: [fileInfo] })
      selectedResources.value = [fileInfo]

      // Cross-space open-via-search: drop stale ancestor metadata.
      if (resourcesStore.ancestorMetaData?.['/'] && unref(space)) {
        if (resourcesStore.ancestorMetaData['/'].spaceId !== unref(space)!.id) {
          resourcesStore.setAncestorMetaData({})
        }
      }
    } catch (e) {
      console.error(e)
      loadingError.value = e as Error
    } finally {
      loading.value = false
    }
  }).restartable()

  watch(currentFileContext, () => loadResourceTask.perform(), { immediate: true })

  // Preview's photo-roll navigates by emitting `update:resource`; the loader
  // owns the ref so it's also the one to update it.
  const setResource = (value: Resource) => {
    space.value = unref(unref(currentFileContext).space)
    resource.value = {
      ...value,
      ...(isShareSpaceResource(unref(space)!) && {
        remoteItemId: unref(space)!.id
      })
    }
    selectedResources.value = [resource.value as Resource]
  }

  return {
    resource,
    space,
    loading,
    loadingError,
    setResource,
    closeApp,
    activeFiles,
    isFolderLoading,
    loadFolderForFileContext
  }
}
