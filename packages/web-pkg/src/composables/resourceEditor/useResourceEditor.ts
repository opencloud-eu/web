import {
  Ref,
  MaybeRefOrGetter,
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  toRef,
  unref,
  watch
} from 'vue'
import { DateTime } from 'luxon'
import { useTask } from 'vue-concurrency'
import { useGettext } from 'vue3-gettext'
import { useRouter } from 'vue-router'
import { dirname } from 'path'
import toNumber from 'lodash-es/toNumber'

import {
  Resource,
  SpaceResource,
  buildIncomingShareResource,
  call,
  HttpError,
  isPersonalSpaceResource,
  isProjectSpaceResource,
  isShareSpaceResource
} from '@opencloud-eu/web-client'
import { DavPermission } from '@opencloud-eu/web-client/webdav'

import { useRoute, useRouteParam, useRouteQuery } from '../router'
import { useAppDefaults } from '../appDefaults'
import { useAppMeta } from '../appDefaults/useAppMeta'
import { queryItemAsString } from '../appDefaults/useAppNavigation'
import { useClientService } from '../clientService'
import { useEventBus } from '../eventBus'
import { useLoadingService } from '../loadingService'
import { useGetResourceContext } from '../resources'
import { useSelectedResources } from '../selection'
import {
  useAppsStore,
  useConfigStore,
  useMessages,
  useModals,
  useResourcesStore,
  useSharesStore,
  useSpacesStore,
  type ResourceEditorExtension
} from '../piniaStores'
import { formatFileSize, getSharedDriveItem } from '../../helpers'

export interface UseResourceEditorOptions {
  /**
   * Reactive accepted form (ref / getter / plain) to stay consistent with the
   * other extension-registry-driven composables. **Two fields are snapshot
   * once at construction**, however: `extension.appId` (passed to
   * `useAppDefaults`) and `extension.component` (the rendered Vue component).
   * Swapping those at runtime would tear down half the host's wiring — if
   * you need a different appId or component, mount a fresh host instead.
   * Everything else (`fileSizeLimit`, `urlForResourceOptions`,
   * `fileContentOptions`, `disableAutoSave`, `importResourceWithExtension`)
   * is read reactively from `extension`.
   */
  extension: MaybeRefOrGetter<ResourceEditorExtension>
}

/**
 * Centralizes the resource-loading, content-loading, and save logic that used
 * to live inside `AppWrapper.vue`. Consumed by `ResourceEditorRouteHost.vue`
 * (the standalone route mount) — embed-mode support (explicit resource without
 * a matching route) is planned as a follow-up step; today this composable
 * assumes it is called from a route-bound component.
 *
 * Capability detection (load url? load content? autosave? …) is driven off the
 * registered `extension.component`'s declared props/emits, mirroring the
 * pre-refactor heuristic but now typed against `ResourceEditorBindings`.
 */
export function useResourceEditor(options: UseResourceEditorOptions) {
  const extensionRef = toRef(options.extension)
  // Snapshot the identity fields once — see UseResourceEditorOptions JSDoc.
  const appId = unref(extensionRef).appId
  const component = unref(extensionRef).component

  const { $gettext, current: currentLanguage } = useGettext()
  const router = useRouter()
  const currentRoute = useRoute()
  const clientService = useClientService()
  const loadingService = useLoadingService()
  const { getResourceContext } = useGetResourceContext()
  const { selectedResources } = useSelectedResources()
  const { dispatchModal } = useModals()
  const { showMessage, showErrorMessage } = useMessages()
  const appsStore = useAppsStore()
  const spacesStore = useSpacesStore()
  const configStore = useConfigStore()
  const resourcesStore = useResourcesStore()
  const sharesStore = useSharesStore()
  const eventBus = useEventBus()

  // The component's props/emits are static for the lifetime of the host —
  // they're snapshot once. Editor vs viewer is decided at runtime by whether
  // the component declared `update:currentContent`; components that own their
  // own resource loading (preview, etc.) declare `update:resource` instead.
  const componentSpec = component as {
    props?: Record<string, unknown> | string[]
    emits?: string[] | Record<string, unknown>
  }

  const hasProp = (name: string): boolean => {
    const props = componentSpec.props ?? {}
    if (Array.isArray(props)) return props.includes(name)
    return Object.prototype.hasOwnProperty.call(props, name)
  }

  const hasEmit = (name: string): boolean => {
    const emits = componentSpec.emits ?? []
    if (Array.isArray(emits)) return emits.includes(name)
    return Object.prototype.hasOwnProperty.call(emits, name)
  }

  const isEditor = computed(() => hasEmit('update:currentContent'))
  const noResourceLoading = computed(() => hasEmit('update:resource'))

  const {
    applicationConfig,
    closeApp,
    currentFileContext,
    getFileContents,
    getFileInfo,
    getUrlForResource,
    putFileContents,
    replaceInvalidFileRoute,
    revokeUrl,
    activeFiles,
    loadFolderForFileContext,
    isFolderLoading
  } = useAppDefaults({
    applicationId: appId
  })

  const { applicationMeta } = useAppMeta({
    applicationId: appId,
    appsStore
  })

  const fileSizeLimit = computed(
    () => unref(extensionRef).fileSizeLimit ?? unref(applicationMeta).meta?.fileSizeLimit
  )

  const resource = ref<Resource>() as Ref<Resource>
  const space = ref<SpaceResource>() as Ref<SpaceResource>
  const currentETag = ref('')
  const url = ref('')
  const loading = ref(!unref(noResourceLoading))
  const loadingError = ref<Error | null>(null)
  const isReadOnly = ref(false)
  const serverContent = ref<unknown>()
  const currentContent = ref<unknown>()
  const deleteResourceCallback = ref<(() => void) | null>(null)
  let deleteResourceEventToken = ''

  const isDirty = computed(() => unref(currentContent) !== unref(serverContent))

  const preventUnload = (e: Event) => {
    e.preventDefault()
  }

  watch(isDirty, (dirty) => {
    if (dirty) {
      window.addEventListener('beforeunload', preventUnload)
    } else {
      window.removeEventListener('beforeunload', preventUnload)
    }
  })

  const driveAliasAndItem = useRouteParam('driveAliasAndItem')
  const fileIdQueryItem = useRouteQuery('fileId')
  const fileId = computed(() => queryItemAsString(unref(fileIdQueryItem)))

  // When the user opens a file via fileId (e.g. from search results) without a
  // resolved driveAliasAndItem, we need to look up the drive context first and
  // push a clean route. Once that lands the watcher re-runs with both bits set.
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
      if (!unref(driveAliasAndItem)) {
        yield addMissingDriveAliasAndItem()
      }
      space.value = unref(unref(currentFileContext).space)
      const fileInfo = yield getFileInfo(unref(currentFileContext), { signal })
      resource.value = fileInfo

      if (isShareSpaceResource(unref(space))) {
        // FIXME: As soon the backend exposes oc-remote-id via webdav, remove the assignment below
        unref(resource).remoteItemId = unref(space).id

        if (unref(resource).id === unref(resource).remoteItemId) {
          const sharedDriveItem = yield* call(
            getSharedDriveItem({
              graphClient: clientService.graphAuthenticated,
              spacesStore,
              space: unref(space)
            })
          )

          if (sharedDriveItem) {
            resource.value = {
              ...fileInfo,
              ...buildIncomingShareResource({
                graphRoles: sharesStore.graphRoles,
                driveItem: sharedDriveItem,
                serverUrl: configStore.serverUrl
              }),
              tags: fileInfo.tags // tags are always [] in Graph API, hence take them from webdav
            }
          }
        }
      }
      resourcesStore.initResourceList({ currentFolder: null, resources: [unref(resource)] })
      selectedResources.value = [unref(resource)]
    } catch (e) {
      console.error(e)
      loadingError.value = e as Error
      loading.value = false
    }
  }).restartable()

  const loadFileTask = useTask(function* (signal) {
    try {
      const importExt = unref(extensionRef).importResourceWithExtension
      const newExtension = importExt ? importExt(unref(resource)) : null
      if (newExtension) {
        const timestamp = DateTime.local().toFormat('yyyyMMddHHmmss')
        const targetPath = `${unref(resource).name}_${timestamp}.${newExtension}`
        if (
          !(yield clientService.webdav.copyFiles(
            unref(space),
            unref(resource),
            unref(space),
            { path: targetPath },
            { signal }
          ))
        ) {
          throw new Error($gettext('Importing failed'))
        }

        resource.value = { path: targetPath } as Resource
      }

      if (replaceInvalidFileRoute(currentFileContext, unref(resource))) {
        return
      }

      isReadOnly.value = ![DavPermission.Updateable, DavPermission.FileUpdateable].some(
        (p) => (unref(resource).permissions || '').indexOf(p) > -1
      )

      if (hasProp('currentContent')) {
        const fileContentsResponse = yield* call(
          getFileContents(currentFileContext, {
            ...unref(extensionRef).fileContentOptions,
            signal
          })
        )
        serverContent.value = currentContent.value = fileContentsResponse.body
        currentETag.value = fileContentsResponse.headers['OC-ETag']
      }

      if (hasProp('url')) {
        url.value = yield getUrlForResource(unref(space), unref(resource), {
          ...unref(extensionRef).urlForResourceOptions,
          signal
        })
      }
    } catch (e) {
      console.error(e)
      loadingError.value = e as Error
    } finally {
      loading.value = false
    }
  }).restartable()

  watch(
    currentFileContext,
    async () => {
      if (!unref(noResourceLoading)) {
        await loadResourceTask.perform()

        if (unref(fileSizeLimit) && toNumber(unref(resource).size) > unref(fileSizeLimit)) {
          dispatchModal({
            title: $gettext('File exceeds %{threshold}', {
              threshold: formatFileSize(unref(fileSizeLimit), currentLanguage)
            }),
            message: $gettext(
              '%{resource} exceeds the recommended size of %{threshold} for editing, and may cause performance issues.',
              {
                resource: unref(resource).name,
                threshold: formatFileSize(unref(fileSizeLimit), currentLanguage)
              }
            ),
            confirmText: $gettext('Continue'),
            onCancel: () => {
              closeApp()
            },
            onConfirm: () => {
              loadFileTask.perform()
            }
          })
        } else {
          loadFileTask.perform()
        }
      } else {
        space.value = unref(unref(currentFileContext).space)
      }
    },
    { immediate: true }
  )

  const errorPopup = (error: HttpError) => {
    console.error(error)
    showErrorMessage({
      title: $gettext('An error occurred'),
      desc: error.message,
      errors: [error]
    })
  }

  const autosavePopup = () => {
    showMessage({ title: $gettext('File autosaved') })
  }

  const saveFileTask = useTask(function* () {
    const newContent = unref(currentContent)
    try {
      const putFileContentsResponse = yield putFileContents(currentFileContext, {
        content: newContent as string,
        previousEntityTag: unref(currentETag)
      })
      serverContent.value = newContent
      currentETag.value = putFileContentsResponse.etag
      resourcesStore.upsertResource(putFileContentsResponse)
    } catch (e) {
      switch (e.statusCode) {
        case 401:
        case 403:
          errorPopup(new HttpError($gettext("You're not authorized to save this file"), e.response))
          break
        case 409:
        case 412:
          errorPopup(
            new HttpError(
              $gettext(
                'This file was updated outside this window. Please copy your changes or save the file under a new name (»Save As...«).'
              ),
              e.response
            )
          )
          break
        case 507:
          const projectSpace = spacesStore.spaces.find(
            (s) => s.id === unref(resource).storageId && isProjectSpaceResource(s)
          )
          if (projectSpace) {
            errorPopup(
              new HttpError(
                $gettext('Insufficient quota on "%{spaceName}" to save this file', {
                  spaceName: projectSpace.name
                }),
                e.response
              )
            )
            break
          }
          errorPopup(new HttpError($gettext('Insufficient quota for saving this file'), e.response))
          break
        default:
          errorPopup(new HttpError('', e.response))
      }
    }
  }).drop()

  const save = async () => {
    await saveFileTask.perform()
  }

  const onDeleteResourceCallback = (deletedResources: Resource[]) => {
    const currentResourceDeleted = deletedResources.find(
      (deletedResource) => deletedResource.id === unref(resource)?.id
    )

    if (!currentResourceDeleted) {
      return
    }

    if (unref(deleteResourceCallback)) {
      return unref(deleteResourceCallback)()
    }

    closeApp()
  }

  let autosaveIntervalId: ReturnType<typeof setInterval> | null = null

  onMounted(() => {
    deleteResourceEventToken = eventBus.subscribe(
      'runtime.resource.deleted',
      onDeleteResourceCallback
    )

    if (resourcesStore.ancestorMetaData?.['/'] && unref(space)) {
      const clearAncestorData = resourcesStore.ancestorMetaData['/'].spaceId !== unref(space).id
      if (clearAncestorData) {
        // clear ancestor data in case the user switched spaces (e.g. by opening a file via search results)
        resourcesStore.setAncestorMetaData({})
      }
    }

    if (!unref(isEditor)) {
      return
    }

    const editorOptions = configStore.options.editor
    const disableAutoSave = unref(extensionRef).disableAutoSave
    if (editorOptions.autosaveEnabled && !disableAutoSave) {
      autosaveIntervalId = setInterval(
        async () => {
          if (isDirty.value) {
            await save()
            autosavePopup()
          }
        },
        (editorOptions.autosaveInterval || 120) * 1000
      )
    }
  })

  onBeforeUnmount(() => {
    eventBus.unsubscribe('runtime.resource.deleted', deleteResourceEventToken)

    if (!loadingService.isLoading) {
      window.removeEventListener('beforeunload', preventUnload)
    }

    if (hasProp('url') && unref(url)) {
      revokeUrl(unref(url))
    }

    if (!unref(isEditor)) {
      return
    }

    if (autosaveIntervalId) {
      clearInterval(autosaveIntervalId)
      autosaveIntervalId = null
    }
  })

  // Setters bridging emits from the embedded component back into our state
  const setCurrentContent = (value: unknown) => {
    currentContent.value = value
  }

  const setResource = (value: Resource) => {
    space.value = unref(unref(currentFileContext).space)
    // FIXME: As soon the backend exposes oc-remote-id via webdav, remove the assignment below
    resource.value = {
      ...value,
      ...(isShareSpaceResource(unref(space)) && {
        remoteItemId: unref(space).id
      })
    }
    selectedResources.value = [unref(resource)]
  }

  const registerOnDeleteResourceCallback = (callback: () => void) => {
    deleteResourceCallback.value = callback
  }

  return {
    resource,
    space,
    url,
    currentContent,
    serverContent,
    currentETag,
    loading,
    loadingError,
    isReadOnly,
    isDirty,
    isEditor,
    applicationConfig,
    currentFileContext,
    activeFiles,
    isFolderLoading,
    save,
    closeApp,
    loadFolderForFileContext,
    getUrlForResource,
    revokeUrl,
    setCurrentContent,
    setResource,
    registerOnDeleteResourceCallback,
    deleteResourceCallback
  }
}
