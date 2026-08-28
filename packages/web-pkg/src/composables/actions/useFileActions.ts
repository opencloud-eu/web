import kebabCase from 'lodash-es/kebabCase'
import {
  isShareSpaceResource,
  isTrashResource,
  Resource,
  SpaceResource
} from '@opencloud-eu/web-client'
import { routeToContextQuery } from '../appDefaults'
import { computed, unref } from 'vue'
import { useRouter } from '../router'
import { Action, FileAction, FileActionOptions } from './types'
import { useWindowOpen } from './useWindowOpen'
import { ActionExtension, useAppsStore, useConfigStore, useExtensionRegistry } from '../piniaStores'
import { ApplicationFileExtension } from '../../apps'
import { storeToRefs } from 'pinia'
import { useEmbedMode } from '../embedMode'
import { RouteRecordName } from 'vue-router'

export interface GetFileActionsOptions extends FileActionOptions {}

export interface FileActionOptionsWithEvent extends FileActionOptions<Resource> {
  event?: MouseEvent
}

export const useFileActions = () => {
  const appsStore = useAppsStore()
  const router = useRouter()
  const { isEnabled: isEmbedModeEnabled } = useEmbedMode()
  const { requestExtensions } = useExtensionRegistry()

  const { openUrl } = useWindowOpen()

  const configStore = useConfigStore()
  const { options } = storeToRefs(configStore)

  const getExtensionActions = <T extends Resource = Resource>(
    extensionPoint: string
  ): FileAction<T>[] =>
    (
      requestExtensions<ActionExtension>({
        id: extensionPoint,
        extensionType: 'action'
      }) || []
    ).map((e) => e.action)

  const extensionContextActions = computed<FileAction[]>(() =>
    getExtensionActions('global.files.context-actions')
  )

  const primaryExtensionActions = computed(() => {
    return unref(extensionContextActions).filter((action) => action.category === 'primary')
  })

  const fallbackActions = computed<FileAction[]>(() =>
    getExtensionActions('global.files.default-action-fallback')
  )

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
          iconFillType: fileExtension.iconFillType || appInfo.iconFillType,
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
            if (resources.length !== 1) {
              return false
            }

            const resource = resources[0]

            // Cheap extension/mimeType matching runs first.
            if (resource.extension && fileExtension.extension) {
              if (resource.extension.toLowerCase() !== fileExtension.extension.toLowerCase()) {
                return false
              }
            } else if (resource.mimeType && fileExtension.mimeType) {
              const resourceMimeType = resource.mimeType.toLowerCase()
              const extensionMimeType = fileExtension.mimeType.toLowerCase()
              if (
                resourceMimeType !== extensionMimeType &&
                resourceMimeType.split('/')[0] !== extensionMimeType
              ) {
                return false
              }
            } else {
              return false
            }

            if (isTrashResource(resource)) {
              return false
            }

            if (!resource.canDownload() && !fileExtension.secureView) {
              return false
            }

            // External editor apps (Collabora, …) load the file server-side,
            // so they cannot handle vault-protected files.
            if (resource.isInVault && fileExtension.app?.startsWith('external-')) {
              return false
            }

            // An app may register a file/folder extension purely to
            // contribute icon mapping or a new-file menu entry without
            // owning a route. Default folder navigation takes over.
            const editorRouteName = fileExtension.routeName || fileExtension.app
            if (!editorRouteName || !router.hasRoute(editorRouteName)) {
              return false
            }

            return true
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
    let routeName = appFileExtension.routeName
    if (routeName && !router.hasRoute(routeName)) {
      console.warn(
        `App "${appFileExtension.app}" specifies routeName "${routeName}" but no such route exists.`
      )
      return null
    }

    routeName = routeName || appFileExtension.app
    if (!routeName || !router.hasRoute(routeName)) {
      return null
    }

    return getEditorRouteOpts(routeName, space, resource, remoteItemId)
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
        ...(resource.fileId && { fileId: resource.fileId }),
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
    // Apps may register a file/folder extension purely to contribute icon
    // mapping or a new-file menu entry, without owning an editor route
    // Bail silently rather than pushing to a route that doesn't exist.
    if (!routeName || !router.hasRoute(routeName)) {
      return
    }
    const routeOpts = getEditorRouteOpts(routeName, space, resource, remoteItemId)

    if (unref(options).openFilesInNewTab) {
      const path = router.resolve(routeOpts).href
      const target = `${appFileExtension.routeName}-${resource.path}`

      openUrl(path, target, true)
      return
    }

    router.push(routeOpts)
  }

  /**
   * Returns the _first_ action from actions array which we construct from
   * available mime-types coming from the app-provider and existing actions.
   */
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

    return unref(fallbackActions).find(({ isVisible }) => isVisible(options))
  }

  const getAllOpenWithActions = (
    options: GetFileActionsOptions & { omitEditorActions?: boolean }
  ) => {
    // Editor actions rank above the registry actions: an app that claims a
    // file or folder type is more specific than the generic openers.
    return [
      ...(options.omitEditorActions ? [] : unref(editorActions)),
      ...unref(primaryExtensionActions)
    ]
      .filter((action: FileAction) => action.isVisible(options))
      .sort((a, b) => Number(b.hasPriority) - Number(a.hasPriority))
  }

  return {
    getExtensionActions,
    getDefaultAction,
    getAllOpenWithActions,
    getEditorRouteOpts,
    openEditor,
    triggerDefaultAction
  }
}
