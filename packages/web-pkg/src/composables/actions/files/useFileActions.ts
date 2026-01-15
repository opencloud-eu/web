import kebabCase from 'lodash-es/kebabCase'
import isNil from 'lodash-es/isNil'
import { isShareSpaceResource, Resource, SpaceResource } from '@opencloud-eu/web-client'
import { routeToContextQuery } from '../../appDefaults'
import { isLocationTrashActive } from '../../../router'
import { computed, unref } from 'vue'
import { useRouter } from '../../router'
import {
  Action,
  FileAction,
  FileActionOptions,
  useIsFilesAppActive,
  useIsSearchActive,
  useWindowOpen
} from '../../actions'

import {
  useFileActionsCopy,
  useFileActionsCreateSpaceFromResource,
  useFileActionsDelete,
  useFileActionsDisableSync,
  useFileActionsDownloadArchive,
  useFileActionsDownloadFile,
  useFileActionsEnableSync,
  useFileActionsFavorite,
  useFileActionsMove,
  useFileActionsNavigate,
  useFileActionsRename,
  useFileActionsRestore,
  useFileActionsToggleHideShare
} from './index'
import {
  ActionExtension,
  useAppsStore,
  useConfigStore,
  useExtensionRegistry
} from '../../piniaStores'
import { ApplicationFileExtension } from '../../../apps'
import { storeToRefs } from 'pinia'
import { useEmbedMode } from '../../embedMode'
import { RouteRecordName } from 'vue-router'

export interface GetFileActionsOptions extends FileActionOptions {
  omitSystemActions?: boolean
}

export interface FileActionOptionsWithEvent extends FileActionOptions<Resource> {
  event?: MouseEvent
}

export const useFileActions = () => {
  const appsStore = useAppsStore()
  const router = useRouter()
  const isSearchActive = useIsSearchActive()
  const { isEnabled: isEmbedModeEnabled } = useEmbedMode()
  const { requestExtensions } = useExtensionRegistry()
  const isFilesAppActive = useIsFilesAppActive()

  const { openUrl } = useWindowOpen()

  const configStore = useConfigStore()
  const { options } = storeToRefs(configStore)

  const { actions: enableSyncActions } = useFileActionsEnableSync()
  const { actions: hideShareActions } = useFileActionsToggleHideShare()
  const { actions: copyActions } = useFileActionsCopy()
  const { actions: deleteActions } = useFileActionsDelete()
  const { actions: disableSyncActions } = useFileActionsDisableSync()
  const { actions: downloadArchiveActions } = useFileActionsDownloadArchive()
  const { actions: downloadFileActions } = useFileActionsDownloadFile()
  const { actions: favoriteActions } = useFileActionsFavorite()
  const { actions: moveActions } = useFileActionsMove()
  const { actions: navigateActions } = useFileActionsNavigate()
  const { actions: renameActions } = useFileActionsRename()
  const { actions: restoreActions } = useFileActionsRestore()
  const { actions: createSpaceFromResource } = useFileActionsCreateSpaceFromResource()

  const systemActions = computed<FileAction<any>[]>(() => [
    ...unref(downloadArchiveActions),
    ...unref(downloadFileActions),
    ...unref(deleteActions),
    ...unref(moveActions),
    ...unref(copyActions),
    ...unref(renameActions),
    ...unref(createSpaceFromResource),
    ...unref(restoreActions),
    ...unref(enableSyncActions),
    ...unref(hideShareActions),
    ...unref(disableSyncActions),
    ...unref(favoriteActions)
  ])

  const extensionsContextActions = computed(() => {
    return (
      requestExtensions<ActionExtension>({
        id: 'global.files.context-actions',
        extensionType: 'action'
      }) || []
    )
      .map((e) => e.action)
      .filter(
        (action) =>
          isNil(action.category) || action.category === 'context' || action.category === 'actions'
      )
  })

  const editorActions = computed(() => {
    if (unref(isEmbedModeEnabled)) {
      return []
    }

    return appsStore.fileExtensions
      .map((fileExtension): FileAction => {
        const appInfo = appsStore.apps[fileExtension.app]

        return {
          name: `editor-${fileExtension.app}`,
          label: () => {
            if (fileExtension.label) {
              if (typeof fileExtension.label === 'function') {
                return fileExtension.label()
              }
              return fileExtension.label
            }
            return appInfo.name
          },
          icon: fileExtension.icon || appInfo.icon,
          ...(appInfo.iconFillType && {
            iconFillType: appInfo.iconFillType
          }),
          img: appInfo.img,
          route: ({ space, resources }) => {
            return getEditorRoute({
              appFileExtension: fileExtension,
              space,
              resource: resources[0]
            })
          },
          handler: (options) => openEditor(fileExtension, options.space, options.resources[0]),
          isVisible: ({ resources }) => {
            if (!unref(isFilesAppActive)) {
              return false
            }

            if (resources.length !== 1) {
              return false
            }

            if (!resources[0].canDownload() && !fileExtension.secureView) {
              return false
            }

            if (!unref(isSearchActive) && isLocationTrashActive(router, 'files-trash-generic')) {
              return false
            }

            if (resources[0].extension && fileExtension.extension) {
              return resources[0].extension.toLowerCase() === fileExtension.extension.toLowerCase()
            }

            if (resources[0].mimeType && fileExtension.mimeType) {
              return (
                resources[0].mimeType.toLowerCase() === fileExtension.mimeType.toLowerCase() ||
                resources[0].mimeType.split('/')[0].toLowerCase() ===
                  fileExtension.mimeType.toLowerCase()
              )
            }

            return false
          },
          hasPriority: fileExtension.hasPriority,
          class: `oc-files-actions-${kebabCase(appInfo.name).toLowerCase()}-trigger`
        }
      })
      .sort((first, second) => {
        // Ensure default are listed first
        if (second.hasPriority !== first.hasPriority && second.hasPriority) {
          return 1
        }
        return 0
      })
  })

  const getEditorRoute = ({
    appFileExtension,
    space,
    resource
  }: {
    appFileExtension: ApplicationFileExtension
    space: SpaceResource
    resource: Resource
  }) => {
    const remoteItemId = isShareSpaceResource(space) ? space.id : undefined
    const routeName = appFileExtension.routeName || appFileExtension.app
    const routeOpts = getEditorRouteOpts(routeName, space, resource, remoteItemId)
    return router.resolve(routeOpts)
  }
  const getEditorRouteOpts = (
    routeName: RouteRecordName,
    space: SpaceResource,
    resource: Resource,
    remoteItemId: string,
    templateId?: string
  ) => {
    return {
      name: routeName,
      params: {
        driveAliasAndItem: space?.getDriveAliasAndItem(resource)
      },
      query: {
        ...(remoteItemId && { shareId: remoteItemId }),
        ...(resource.fileId && unref(options).routing.idBased && { fileId: resource.fileId }),
        ...(templateId && { templateId }),
        ...routeToContextQuery(unref(router.currentRoute))
      }
    }
  }

  const openEditor = (
    appFileExtension: ApplicationFileExtension,
    space: SpaceResource,
    resource: Resource
  ) => {
    const remoteItemId = isShareSpaceResource(space) ? space.id : undefined
    const routeName = appFileExtension.routeName || appFileExtension.app
    const routeOpts = getEditorRouteOpts(routeName, space, resource, remoteItemId)

    if (unref(options).cernFeatures) {
      const path = router.resolve(routeOpts).href
      const target = `${appFileExtension.routeName}-${resource.path}`

      openUrl(path, target, true)
      return
    }

    router.push(routeOpts)
  }

  // TODO: Make user-configurable what is a defaultAction for a filetype/mimetype
  // returns the _first_ action from actions array which we now construct from
  // available mime-types coming from the app-provider and existing actions
  const triggerDefaultAction = (options: GetFileActionsOptions) => {
    const action = getDefaultAction(options)
    if (action) {
      action.handler({ ...options })
    }
  }

  const getDefaultAction = (options: GetFileActionsOptions): Action | undefined => {
    const actions = getAllOpenWithActions(options)
    if (actions.length) {
      return actions[0]
    }
    return undefined
  }

  const getAllOpenWithActions = (options: GetFileActionsOptions) => {
    const filterCallback = (action: FileAction) => action.isVisible(options)

    const primaryActions = [
      ...unref(extensionsContextActions),
      ...unref(editorActions),
      ...unref(navigateActions)
    ]
      .filter(filterCallback)
      .sort((a, b) => Number(b.hasPriority) - Number(a.hasPriority))

    const secondaryActions = options.omitSystemActions
      ? []
      : unref(systemActions).filter(filterCallback)

    return [...primaryActions, ...secondaryActions]
  }

  return {
    getDefaultAction,
    getAllOpenWithActions,
    getEditorRouteOpts,
    openEditor,
    triggerDefaultAction
  }
}
