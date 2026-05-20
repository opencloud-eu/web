import {
  MaybeRefOrGetter,
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  toRef,
  unref,
  watch
} from 'vue'
import { useTask } from 'vue-concurrency'
import { useGettext } from 'vue3-gettext'
import toNumber from 'lodash-es/toNumber'

import {
  HttpError,
  Resource,
  SpaceResource,
  call,
  isProjectSpaceResource,
  urlJoin
} from '@opencloud-eu/web-client'
import { DavPermission } from '@opencloud-eu/web-client/webdav'

import { useAppConfig } from '../appDefaults/useAppConfig'
import { useAppFileHandling } from '../appDefaults/useAppFileHandling'
import { useAppMeta } from '../appDefaults/useAppMeta'
import type { FileContext } from '../appDefaults/types'
import { useClientService } from '../clientService'
import { useEventBus } from '../eventBus'
import { useLoadingService } from '../loadingService'
import {
  useAppsStore,
  useConfigStore,
  useMessages,
  useModals,
  useResourcesStore,
  useSpacesStore,
  type ResourceEditorExtension
} from '../piniaStores'
import { formatFileSize } from '../../helpers'

export interface UseResourceEditorOptions {
  extension: MaybeRefOrGetter<ResourceEditorExtension>
  resource: MaybeRefOrGetter<Resource | undefined>
  space: MaybeRefOrGetter<SpaceResource | undefined>
  onClose?: () => void
  onResourceUpdate?: (resource: Resource) => void
  activeFiles?: MaybeRefOrGetter<Resource[]>
  isFolderLoading?: MaybeRefOrGetter<boolean>
  loadFolderForFileContext?: (ctx: FileContext) => Promise<void>
}

/**
 * Resource-agnostic core: given an extension + resource + space, resolves
 * capability-driven bindings (`url`, `currentContent`) by inspecting the
 * component's declared props/emits, and runs save/dirty/autosave for editors.
 * Route reading and resource resolution are the caller's responsibility.
 */
export function useResourceEditor(options: UseResourceEditorOptions) {
  const extensionRef = toRef(options.extension)
  const resource = toRef(options.resource)
  const space = toRef(options.space)
  const activeFiles = toRef(options.activeFiles ?? [])
  const isFolderLoading = toRef(options.isFolderLoading ?? false)

  // appId and component are snapshot at construction; swapping them would
  // tear down half the host's wiring, mount a fresh host instead.
  const appId = unref(extensionRef).appId
  const component = unref(extensionRef).component

  const { $gettext, current: currentLanguage } = useGettext()
  const clientService = useClientService()
  const loadingService = useLoadingService()
  const { dispatchModal } = useModals()
  const { showMessage, showErrorMessage } = useMessages()
  const appsStore = useAppsStore()
  const spacesStore = useSpacesStore()
  const configStore = useConfigStore()
  const resourcesStore = useResourcesStore()
  const eventBus = useEventBus()

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

  const { getFileContents, getFileInfo, putFileContents, getUrlForResource, revokeUrl } =
    useAppFileHandling({ clientService })
  const { applicationConfig } = useAppConfig({ appsStore, applicationId: appId })
  const { applicationMeta } = useAppMeta({ applicationId: appId, appsStore })

  const fileSizeLimit = computed(
    () => unref(extensionRef).fileSizeLimit ?? unref(applicationMeta).meta?.fileSizeLimit
  )

  // clientService.webdav calls only read space/item/itemId/path from
  // FileContext, routing fields stay empty in the embed case.
  const currentFileContext = computed<FileContext>(() => {
    const r = unref(resource)
    const s = unref(space)
    return {
      path: r && s ? urlJoin(s.webDavPath, r.path) : '',
      space: s as SpaceResource,
      item: r?.path ?? '',
      itemId: r?.id ?? '',
      fileName: r?.name ?? '',
      driveAliasAndItem: '',
      routeName: '',
      routeParams: {},
      routeQuery: {}
    }
  })

  const currentETag = ref('')
  const url = ref('')
  const loadingError = ref<Error | null>(null)
  const isReadOnly = ref(false)
  const serverContent = ref<unknown>()
  const currentContent = ref<unknown>()
  const deleteResourceCallback = ref<(() => void) | null>(null)
  let deleteResourceEventToken = ''

  const loading = ref(false)
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

  const loadFileTask = useTask(function* (signal) {
    const r = unref(resource)
    const s = unref(space)
    if (!r || !s) {
      return
    }
    try {
      loading.value = true
      loadingError.value = null
      // Revoke the previous blob URL so resource swaps don't leak ObjectURLs.
      if (hasProp('url') && url.value) {
        revokeUrl(url.value)
        url.value = ''
      }

      isReadOnly.value = ![DavPermission.Updateable, DavPermission.FileUpdateable].some(
        (p) => (r.permissions || '').indexOf(p) > -1
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
        url.value = yield getUrlForResource(s, r, {
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
    [() => unref(resource), () => unref(space)],
    ([r]) => {
      if (!r) {
        return
      }
      const limit = unref(fileSizeLimit)
      if (limit && toNumber(r.size) > limit) {
        dispatchModal({
          title: $gettext('File exceeds %{threshold}', {
            threshold: formatFileSize(limit, currentLanguage)
          }),
          message: $gettext(
            '%{resource} exceeds the recommended size of %{threshold} for editing, and may cause performance issues.',
            {
              resource: r.name,
              threshold: formatFileSize(limit, currentLanguage)
            }
          ),
          confirmText: $gettext('Continue'),
          onCancel: () => {
            options.onClose?.()
          },
          onConfirm: () => {
            loadFileTask.perform()
          }
        })
      } else {
        loadFileTask.perform()
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
    const r = unref(resource)
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
            (s) => s.id === r?.storageId && isProjectSpaceResource(s)
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

  const closeApp = () => {
    options.onClose?.()
  }

  const onDeleteResourceCallback = (deletedResources: Resource[]) => {
    const currentResourceDeleted = deletedResources.find(
      (deletedResource) => deletedResource.id === unref(resource)?.id
    )
    if (!currentResourceDeleted) {
      return
    }
    if (unref(deleteResourceCallback)) {
      return unref(deleteResourceCallback)!()
    }
    closeApp()
  }

  let autosaveIntervalId: ReturnType<typeof setInterval> | null = null

  onMounted(() => {
    deleteResourceEventToken = eventBus.subscribe(
      'runtime.resource.deleted',
      onDeleteResourceCallback
    )

    if (!unref(isEditor)) {
      return
    }

    const editorOptions = configStore.options.editor
    const disableAutoSave = unref(extensionRef).disableAutoSave
    if (editorOptions?.autosaveEnabled && !disableAutoSave) {
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

    if (autosaveIntervalId) {
      clearInterval(autosaveIntervalId)
      autosaveIntervalId = null
    }
  })

  const setCurrentContent = (value: unknown) => {
    currentContent.value = value
  }
  const setResource = (value: Resource) => {
    options.onResourceUpdate?.(value)
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
    getUrlForResource,
    revokeUrl,
    loadFolderForFileContext: options.loadFolderForFileContext ?? (async () => undefined),
    setCurrentContent,
    setResource,
    registerOnDeleteResourceCallback,
    deleteResourceCallback
  }
}
