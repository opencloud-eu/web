<template>
  <main
    :id="applicationId"
    class="app-wrapper h-full rounded-xl"
    :class="{ 'border-0': applicationId.startsWith('external-') }"
    @keydown.esc="closeApp"
  >
    <h1 class="sr-only" v-text="pageTitle" />
    <loading-screen v-if="loading" />
    <error-screen v-else-if="loadingError" :message="loadingError.message" />
    <div v-else class="flex size-full">
      <slot
        class="app-wrapper-content size-full"
        :class="{ 'w-[calc(100%-360px)]': isSideBarOpen && !isMobile }"
        v-bind="slotAttrs"
      />
      <file-side-bar :space="space" />
    </div>
  </main>
</template>

<script setup lang="ts">
import {
  Ref,
  defineComponent,
  onBeforeUnmount,
  ref,
  unref,
  watch,
  computed,
  onMounted,
  markRaw
} from 'vue'
import { DateTime } from 'luxon'
import { useTask } from 'vue-concurrency'
import { useGettext } from 'vue3-gettext'
import { onBeforeRouteLeave, useRouter } from 'vue-router'

import AppTopBar from '../AppTopBar.vue'
import ErrorScreen from './PartialViews/ErrorScreen.vue'
import LoadingScreen from './PartialViews/LoadingScreen.vue'
import FileSideBar from '../SideBar/FileSideBar.vue'
import {
  UrlForResourceOptions,
  queryItemAsString,
  useAppDefaults,
  useClientService,
  useRoute,
  useRouteParam,
  useRouteQuery,
  useSelectedResources,
  useSideBar,
  useModals,
  useMessages,
  useSpacesStore,
  useAppsStore,
  useConfigStore,
  useResourcesStore,
  FileContentOptions,
  FileContext,
  useFileActionsDownloadFile,
  FileActionOptions,
  FileAction,
  useLoadingService,
  useFileActionsSaveAs,
  useSharesStore,
  useFileActionsDelete,
  useEventBus,
  Action,
  Modifier,
  Key,
  useAppMeta,
  useGetResourceContext,
  useKeyboardActions,
  useExtensionRegistry,
  ActionExtension,
  CustomComponentExtension
} from '../../composables'
import {
  Resource,
  SpaceResource,
  buildIncomingShareResource,
  call,
  isPersonalSpaceResource,
  isProjectSpaceResource,
  isShareSpaceResource
} from '@opencloud-eu/web-client'
import { DavPermission } from '@opencloud-eu/web-client/webdav'
import { HttpError } from '@opencloud-eu/web-client'
import { dirname } from 'path'
import { useFileActionsOpenWithApp } from '../../composables'
import { UnsavedChangesModal } from '../Modals'
import {
  decryptResourceInPlace,
  formatFileSize,
  getSharedDriveItem,
  resolveFolderVault,
  streamToArrayBuffer,
  streamToBlob
} from '../../helpers'
import toNumber from 'lodash-es/toNumber'
import { useIsMobile } from '@opencloud-eu/design-system/composables'
import { storeToRefs } from 'pinia'

const {
  applicationId,
  urlForResourceOptions = null,
  fileContentOptions = null,
  wrappedComponent = null,
  importResourceWithExtension = () => null,
  disableAutoSave = false
} = defineProps<{
  applicationId: string
  urlForResourceOptions?: UrlForResourceOptions
  fileContentOptions?: FileContentOptions
  wrappedComponent?: ReturnType<typeof defineComponent>
  importResourceWithExtension?: (resource: Resource) => string
  disableAutoSave?: boolean
}>()

const { $gettext, current: currentLanguage } = useGettext()
const appsStore = useAppsStore()
const { showMessage, showErrorMessage } = useMessages()
const router = useRouter()
const currentRoute = useRoute()
const clientService = useClientService()
const loadingService = useLoadingService()
const { getResourceContext } = useGetResourceContext()
const { selectedResources } = useSelectedResources()
const { dispatchModal } = useModals()
const spacesStore = useSpacesStore()
const configStore = useConfigStore()
const resourcesStore = useResourcesStore()
const sharesStore = useSharesStore()
const eventBus = useEventBus()
const { isMobile } = useIsMobile()
const sidebarStore = useSideBar()
const { isSideBarOpen } = storeToRefs(sidebarStore)

const { actions: openWithAppActions } = useFileActionsOpenWithApp({
  appId: applicationId
})
const { actions: downloadFileActions } = useFileActionsDownloadFile()
const { actions: deleteFileActions } = useFileActionsDelete()

const noResourceLoading = computed(() => {
  // component has its own way to load the resource(s)
  return Boolean(wrappedComponent.emits?.includes('update:resource'))
})

const resource: Ref<Resource> = ref()
const space: Ref<SpaceResource> = ref()
const currentETag = ref('')
const url = ref('')
const loading = ref(!unref(noResourceLoading))
const loadingError: Ref<Error> = ref()
const isReadOnly = ref(false)
const serverContent = ref<unknown>()
const currentContent = ref<unknown>()
let deleteResourceEventToken = ''
let appOnDeleteResourceCallback: (() => void) | null = null

const extensionRegistry = useExtensionRegistry()
const { registerExtensions, unregisterExtensions, requestExtensions } = extensionRegistry
const topBarExtensionId = 'app.app-wrapper.app-top-bar'
const appBarExtension = computed<CustomComponentExtension[]>(() => {
  if (unref(loading) || unref(loadingError) || !unref(resource)) {
    return []
  }
  return [
    {
      id: topBarExtensionId,
      type: 'customComponent',
      extensionPointIds: ['app.runtime.header.left'],
      content: markRaw(AppTopBar),
      componentProps: () => ({
        resource: unref(resource),
        isReadOnly: unref(isReadOnly),
        isEditor: unref(isEditor),
        hasAutoSave: !disableAutoSave,
        mainActions: unref(fileActions),
        dropDownMenuSections: unref(dropDownMenuSections),
        dropDownActionOptions: unref(actionOptions),
        onClose: () => {
          closeApp()
        }
      })
    }
  ]
})

registerExtensions(appBarExtension)

const { actions: saveAsActions } = useFileActionsSaveAs({ content: currentContent })

const isEditor = computed(() => {
  return Boolean(wrappedComponent.emits?.includes('update:currentContent'))
})

const hasProp = (name: string) => {
  return Boolean(Object.keys(wrappedComponent.props).includes(name))
}

const isDirty = computed(() => {
  return unref(currentContent) !== unref(serverContent)
})

const preventUnload = (e: Event) => {
  e.preventDefault()
}

watch(isDirty, (dirty) => {
  // Prevent reload if there are changes
  if (dirty) {
    window.addEventListener('beforeunload', preventUnload)
  } else {
    window.removeEventListener('beforeunload', preventUnload)
  }
})

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
  applicationId
})

const { applicationMeta } = useAppMeta({ applicationId, appsStore })

const fileSizeLimit = computed(() => {
  return unref(applicationMeta).meta?.fileSizeLimit
})

const pageTitle = computed(() => {
  const { name: appName } = unref(applicationMeta)

  return $gettext(`%{appName} for %{fileName}`, {
    appName: $gettext(appName),
    fileName: unref(unref(currentFileContext).fileName)
  })
})

const driveAliasAndItem = useRouteParam('driveAliasAndItem')
const fileIdQueryItem = useRouteQuery('fileId')
const fileId = computed(() => {
  return queryItemAsString(unref(fileIdQueryItem))
})

const addMissingDriveAliasAndItem = async () => {
  const id = unref(fileId)
  const { space, path } = await getResourceContext(id)
  const driveAliasAndItem = space.getDriveAliasAndItem({ path } as Resource)

  if (isPersonalSpaceResource(space)) {
    return router.push({
      params: {
        ...unref(currentRoute).params,
        driveAliasAndItem
      },
      query: {
        ...unref(currentRoute).query,
        fileId: id,
        contextRouteName: 'files-spaces-generic',
        contextRouteParams: { driveAliasAndItem: dirname(driveAliasAndItem) } as any
      }
    })
  }

  return router.push({
    params: {
      ...unref(currentRoute).params,
      driveAliasAndItem
    },
    query: {
      ...unref(currentRoute).query,
      fileId: id,
      contextRouteName: path === '/' ? 'files-shares-with-me' : 'files-spaces-generic',
      ...(isShareSpaceResource(space) && { shareId: space.id }),
      contextRouteParams: {
        driveAliasAndItem: dirname(driveAliasAndItem)
      } as any,
      contextRouteQuery: {
        ...(isShareSpaceResource(space) && { shareId: space.id })
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
    // Decrypt name/path/extension when the resource lives inside a vault, so
    // every consumer of `resource.value` (top bar, side bar, document title,
    // resource list…) sees cleartext.
    const vaultEngine = resolveFolderVault(
      extensionRegistry,
      unref(space),
      unref(unref(currentFileContext).item)
    )
    if (vaultEngine) {
      yield* call(decryptResourceInPlace(vaultEngine, fileInfo))
    }
    resource.value = fileInfo

    if (isShareSpaceResource(unref(space))) {
      // FIXME: As soon the backend exposes oc-remote-id via webdav, remove the assignment below
      unref(resource).remoteItemId = unref(space).id

      if (unref(resource).id === unref(resource).remoteItemId) {
        // use graph api to build incoming share resource
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
    loadingError.value = e
    loading.value = false
  }
}).restartable()

const loadFileTask = useTask(function* (signal) {
  try {
    const newExtension = importResourceWithExtension(unref(resource))
    if (newExtension) {
      const timestamp = DateTime.local().toFormat('yyyyMMddHHmmss')
      const targetPath = `${unref(resource).name}_${timestamp}.${newExtension}`
      if (
        !(yield clientService.webdav.copyFiles(
          unref(space),
          unref(resource),
          unref(space),
          {
            path: targetPath
          },
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

    if (unref(hasProp('currentContent'))) {
      // Vault-aware content handling. We do all of this above the webdav
      // client: ask the server for the raw ciphertext blob using its real
      // (encrypted) path, run it through the engine's decrypt stream, and
      // hand the embedded app whatever response type it expected. The webdav
      // primitives stay completely unaware of vaults.
      const vaultEngine = resolveFolderVault(extensionRegistry, unref(space), unref(resource)?.path)
      const originalResponseType = fileContentOptions?.responseType
      const fetchOptions = vaultEngine
        ? { ...fileContentOptions, responseType: 'arraybuffer' as const }
        : fileContentOptions

      // The webdav call needs the encrypted server-side path. resource.path is
      // already cleartext at this point (we decrypted it in loadResourceTask),
      // so we re-encrypt for this single request and leave the context the
      // rest of the UI sees untouched.
      const baseCtx = unref(currentFileContext)
      const fetchCtx = vaultEngine
        ? { ...baseCtx, item: yield* call(vaultEngine.encryptPath(unref(baseCtx.item))) }
        : baseCtx

      const fileContentsResponse = yield* call(
        getFileContents(fetchCtx, { ...fetchOptions, signal })
      )
      let body = fileContentsResponse.body

      if (vaultEngine) {
        // FIXME(poc-vault): engine API is streaming, but both ends still hold
        // bytes in memory — getFileContents resolves to a full ArrayBuffer,
        // and editors want string/Blob/ArrayBuffer. End-to-end streaming
        // hinges on exposing the fetch response.body upstream; landing that
        // later won't require changes here.
        const plaintextStream = vaultEngine.decryptContent(new Blob([body as ArrayBuffer]).stream())
        const plaintextBuffer: ArrayBuffer = yield* call(streamToArrayBuffer(plaintextStream))
        const plaintext = new Uint8Array(plaintextBuffer)

        if (!originalResponseType || originalResponseType === 'text') {
          body = new TextDecoder().decode(plaintext)
        } else if (originalResponseType === 'blob') {
          body = new Blob([plaintext as BlobPart])
        } else {
          body = plaintext.buffer
        }
      }

      serverContent.value = currentContent.value = body
      currentETag.value = fileContentsResponse.headers['OC-ETag']
    }

    if (unref(hasProp('url'))) {
      // Vault-aware preview/download URL: getUrlForResource would otherwise
      // hand the app a URL that downloads the *encrypted* blob from the
      // server — broken for preview, mediaviewer, pdf-viewer etc. For vault
      // resources we fetch ciphertext ourselves, run it through the engine
      // and expose the cleartext as an in-memory blob URL.
      const urlVaultEngine = resolveFolderVault(
        extensionRegistry,
        unref(space),
        unref(resource)?.path
      )
      if (urlVaultEngine) {
        const baseCtx = unref(currentFileContext)
        const fetchCtx = {
          ...baseCtx,
          item: yield* call(urlVaultEngine.encryptPath(unref(baseCtx.item)))
        }
        const cipherResponse = yield* call(
          getFileContents(fetchCtx, {
            ...fileContentOptions,
            responseType: 'arraybuffer',
            signal
          })
        )
        // Collect the engine output straight into the Blob we hand to
        // URL.createObjectURL — no intermediate Uint8Array in this path.
        const blob: Blob = yield* call(
          streamToBlob(
            urlVaultEngine.decryptContent(new Blob([cipherResponse.body as ArrayBuffer]).stream()),
            unref(resource)?.mimeType || 'application/octet-stream'
          )
        )
        url.value = URL.createObjectURL(blob)
      } else {
        url.value = yield getUrlForResource(unref(space), unref(resource), {
          ...urlForResourceOptions,
          signal
        })
      }
    }
  } catch (e) {
    console.error(e)
    loadingError.value = e
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
    // Vault-aware save: when the resource is inside a vault, the cleartext
    // we have in memory has to be encrypted, the put has to target the
    // encrypted server path, and the response describing the freshly stored
    // blob has to be decrypted back to cleartext before it enters the store.
    const vaultEngine = resolveFolderVault(extensionRegistry, unref(space), unref(resource)?.path)

    let putCtx: FileContext | typeof currentFileContext = currentFileContext
    let putContent: string | ArrayBuffer = newContent as string

    if (vaultEngine) {
      const baseCtx = unref(currentFileContext)
      // Blob is the easiest "give me a stream over these bytes" primitive
      // regardless of whether the editor handed us a string, ArrayBuffer or
      // Uint8Array. The engine output goes back through Response#arrayBuffer
      // to land in the shape webdav.putFileContents wants.
      const plainBlob = newContent instanceof Blob ? newContent : new Blob([newContent as BlobPart])
      putContent = yield* call(streamToArrayBuffer(vaultEngine.encryptContent(plainBlob.stream())))
      putCtx = { ...baseCtx, item: yield* call(vaultEngine.encryptPath(unref(baseCtx.item))) }
    }

    const putFileContentsResponse = yield putFileContents(putCtx, {
      content: putContent,
      previousEntityTag: unref(currentETag)
    })
    if (vaultEngine) {
      yield* call(decryptResourceInPlace(vaultEngine, putFileContentsResponse))
    }
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
        const space = spacesStore.spaces.find(
          (space) => space.id === unref(resource).storageId && isProjectSpaceResource(space)
        )
        if (space) {
          errorPopup(
            new HttpError(
              $gettext('Insufficient quota on "%{spaceName}" to save this file', {
                spaceName: space.name
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

let autosaveIntervalId: ReturnType<typeof setInterval> = null
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
  unregisterExtensions([topBarExtensionId])

  if (!loadingService.isLoading) {
    window.removeEventListener('beforeunload', preventUnload)
  }

  if (unref(hasProp('url'))) {
    revokeUrl(url.value)
  }

  if (!unref(isEditor)) {
    return
  }

  clearInterval(autosaveIntervalId)
  autosaveIntervalId = null
})

const { bindKeyAction } = useKeyboardActions({ skipDisabledKeyBindingsCheck: true })
bindKeyAction({ modifier: Modifier.Ctrl, primary: Key.S }, () => {
  if (!unref(isDirty)) {
    return
  }
  save()
})

const fileActionsSave = computed<FileAction[]>(() => {
  return [
    {
      name: 'save-file',
      disabledTooltip: () => '',
      isVisible: () => unref(isEditor) && !unref(isReadOnly),
      isDisabled: () => !unref(isDirty),
      icon: 'save',
      id: 'app-save-action',
      label: () => $gettext('Save'),
      handler: save
    }
  ]
})

const actionOptions = computed<FileActionOptions>(() => {
  return {
    space: unref(space),
    resources: [unref(resource)]
  }
})

/**
 * The interceptor is used to save the file automatically when in dirty state,
 * so the downloaded file equals the current state
 */
const downloadFileActionInterceptor = async (
  args: FileActionOptions,
  originalAction: Action<FileActionOptions>['handler']
) => {
  if (unref(isDirty)) {
    await save()
    autosavePopup()
  }
  originalAction(args)
}

const onDeleteResourceCallback = (deletedResources: Resource[]) => {
  const currentResourceDeleted = deletedResources.find(
    (deletedResource) => deletedResource.id === unref(resource).id
  )

  if (!currentResourceDeleted) {
    return
  }

  if (appOnDeleteResourceCallback) {
    return appOnDeleteResourceCallback()
  }

  closeApp()
}

const menuItemsPrimary = computed(() => {
  return [
    ...unref(openWithAppActions),
    ...unref(fileActionsSave),
    ...unref(saveAsActions).map((action) => {
      return {
        ...action,
        isVisible: (args: FileActionOptions) => isEditor.value && action.isVisible(args)
      }
    })
  ].filter((item) => item.isVisible(unref(actionOptions)))
})

const extensionContextActions = computed(() => {
  return (
    requestExtensions<ActionExtension>({
      id: 'global.files.context-actions',
      extensionType: 'action'
    }) || []
  ).map((e) => e.action)
})

const menuItemsSecondary = computed(() => {
  return unref(extensionContextActions)
    .filter((action) => action.category === 'secondary')
    .filter((item) => item.isVisible(unref(actionOptions)))
})
const menuItemsTertiary = computed(() => {
  return [
    ...unref(downloadFileActions).map((originalAction) => ({
      ...originalAction,
      handler: (args: FileActionOptions) =>
        downloadFileActionInterceptor(args, originalAction.handler)
    })),
    ...unref(deleteFileActions)
  ].filter((item) => item.isVisible(unref(actionOptions)))
})
const menuItemsQuaternary = computed(() => {
  return unref(extensionContextActions)
    .filter((action) => action.category === 'quaternary')
    .filter((item) => item.isVisible(unref(actionOptions)))
})
const dropDownMenuSections = computed(() => {
  const sections = []

  if (unref(menuItemsPrimary).length) {
    sections.push({
      name: 'primary',
      items: unref(menuItemsPrimary)
    })
  }
  if (unref(menuItemsSecondary).length) {
    sections.push({
      name: 'secondary',
      items: unref(menuItemsSecondary)
    })
  }
  if (unref(menuItemsTertiary).length) {
    sections.push({
      name: 'tertiary',
      items: unref(menuItemsTertiary)
    })
  }
  if (unref(menuItemsQuaternary).length) {
    sections.push({
      name: 'quaternary',
      items: unref(menuItemsQuaternary)
    })
  }
  return sections
})

const fileActions = computed((): Action[] => [...unref(fileActionsSave)])

onBeforeRouteLeave((_to, _from, next) => {
  if (unref(isDirty)) {
    dispatchModal({
      title: $gettext('Unsaved changes'),
      customComponent: markRaw(UnsavedChangesModal),
      focusTrapInitial: '.oc-modal-body-actions-confirm',
      hideActions: true,
      hideCancelButton: true,
      customComponentAttrs: () => {
        return {
          closeCallback: () => {
            unregisterExtensions([topBarExtensionId])
            next()
          }
        }
      },
      async onConfirm() {
        unregisterExtensions([topBarExtensionId])
        await save()
        next()
      }
    })
  } else {
    unregisterExtensions([topBarExtensionId])
    next()
  }
})

const slotAttrs = computed(() => ({
  url: unref(url),
  space: unref(unref(currentFileContext).space),
  resource: unref(resource),
  activeFiles: unref(activeFiles),
  isDirty: unref(isDirty),
  isReadOnly: unref(isReadOnly),
  applicationConfig: unref(applicationConfig),
  currentFileContext: unref(currentFileContext),
  currentContent: unref(currentContent),
  isFolderLoading: unref(isFolderLoading),

  'onUpdate:resource': (value: Resource) => {
    space.value = unref(unref(currentFileContext).space)

    // FIXME: As soon the backend exposes oc-remote-id via webdav, remove the assignment below
    resource.value = {
      ...value,
      ...(isShareSpaceResource(unref(space)) && {
        remoteItemId: unref(space).id
      })
    }

    selectedResources.value = [unref(resource)]
  },
  'onUpdate:currentContent': (value: unknown) => {
    currentContent.value = value
  },

  'onRegister:onDeleteResourceCallback': (value: () => void) => {
    appOnDeleteResourceCallback = value
  },

  'onDelete:resource': () => {
    if (
      !unref(deleteFileActions)[0].isVisible({
        space: unref(space),
        resources: [unref(resource)]
      })
    ) {
      return
    }

    unref(deleteFileActions)[0].handler({
      space: unref(space),
      resources: [unref(resource)]
    })
  },

  onSave: save,
  onClose: closeApp,
  loadFolderForFileContext,
  revokeUrl,
  getUrlForResource
}))
</script>
