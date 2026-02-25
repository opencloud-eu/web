<template>
  <div v-if="isCollabora" id="chrome-colors" class="bg-role-chrome text-role-on-chrome hidden" />
  <div v-if="isLoading" class="size-full flex justify-center items-center">
    <oc-spinner size="large" />
  </div>
  <iframe
    v-else-if="appUrl && method === 'GET'"
    :src="appUrl"
    class="size-full"
    :title="iFrameTitle"
    allowfullscreen
    allow="clipboard-read *; clipboard-write *"
  />
  <div v-if="appUrl && method === 'POST' && formParameters" class="size-full">
    <form :action="appUrl" target="app-iframe" method="post">
      <input ref="subm" type="submit" :value="formParameters" class="hidden" />
      <div v-for="(item, key, index) in formParameters" :key="index">
        <input :name="key" :value="item" type="hidden" />
      </div>
      <input
        v-if="isCollabora"
        name="ui_defaults"
        :value="getCollaboraUiDefaults()"
        type="hidden"
      />
      <input v-if="isCollabora" name="css_variables" :value="getCollaboraCss()" type="hidden" />
    </form>
    <iframe
      ref="appIframe"
      name="app-iframe"
      class="size-full"
      :title="iFrameTitle"
      allowfullscreen
      allow="clipboard-read *; clipboard-write *"
    />
  </div>
</template>

<script setup lang="ts">
import { stringify } from 'qs'
import {
  computed,
  unref,
  nextTick,
  ref,
  watch,
  onMounted,
  useTemplateRef,
  onBeforeUnmount
} from 'vue'
import { useTask } from 'vue-concurrency'
import { useGettext } from 'vue3-gettext'
import {
  GraphSharePermission,
  Resource,
  SpaceResource,
  isProjectSpaceResource,
  isPublicSpaceResource,
  isShareSpaceResource
} from '@opencloud-eu/web-client'
import { urlJoin } from '@opencloud-eu/web-client'
import {
  isSameResource,
  useCapabilityStore,
  useConfigStore,
  useMessages,
  useRequest,
  useAppProviderService,
  useRoute,
  queryItemAsString,
  useRouteQuery,
  getSharedDriveItem,
  setCurrentUserShareSpacePermissions,
  useSpacesStore,
  useClientService,
  useSharesStore,
  useModals,
  useRouter,
  useThemeStore,
  useFolderLink,
  FilePickerModal
} from '@opencloud-eu/web-pkg'
import FileNameModal from './components/FileNameModal.vue'
import { DavProperty } from '@opencloud-eu/web-client/webdav'

const { space, resource, isReadOnly } = defineProps<{
  space: SpaceResource
  resource: Resource
  isReadOnly: boolean
}>()

defineEmits(['save', 'close']) // these are inherited from the AppWrapper.vue

const language = useGettext()
const { $gettext } = language
const { showErrorMessage } = useMessages()
const capabilityStore = useCapabilityStore()
const configStore = useConfigStore()
const route = useRoute()
const router = useRouter()
const appProviderService = useAppProviderService()
const { makeRequest } = useRequest()
const spacesStore = useSpacesStore()
const sharesStore = useSharesStore()
const { graphAuthenticated: graphClient, webdav } = useClientService()
const { dispatchModal } = useModals()
const { currentTheme } = useThemeStore()
const { getParentFolderLink } = useFolderLink()

const viewModeQuery = useRouteQuery('view_mode')
const viewModeQueryValue = computed(() => {
  return queryItemAsString(unref(viewModeQuery))
})

const templateIdQuery = useRouteQuery('templateId')
const templateIdQueryValue = computed(() => {
  return queryItemAsString(unref(templateIdQuery))
})

const appName = computed(() => {
  const lowerCaseAppName = unref(route)
    .name.toString()
    .replace('external-', '')
    .replace('-apps', '')
  return appProviderService.appNames.find((appName) => appName.toLowerCase() === lowerCaseAppName)
})

const appUrl = ref<string>()
const formParameters = ref<Record<string, string>>({})
const method = ref<string>()
const subm = useTemplateRef('subm')
const isLoading = computed(() => loadAppUrl.isRunning || getSharedDriveItemTask.isRunning)

const iFrameTitle = computed(() => {
  return $gettext('"%{appName}" app content area', {
    appName: unref(appName)
  })
})

const errorPopup = (error: string) => {
  showErrorMessage({
    title: $gettext('An error occurred'),
    desc: error,
    errors: [new Error(error)]
  })
}

const getCollaboraUiDefaults = () => {
  const theme = currentTheme.isDark ? 'dark' : 'light'
  return `UITheme=${theme}`
}

const getCollaboraCss = () => {
  const chromeEl = document.getElementById('chrome-colors')
  if (!chromeEl) {
    return ''
  }
  const chromeStyle = window.getComputedStyle(chromeEl)
  const chromeColor = chromeStyle.getPropertyValue('background-color')
  const onChromeColor = chromeStyle.getPropertyValue('color')
  return `--co-body-bg=${chromeColor};--co-color-main-text=${onChromeColor}`
}

const loadAppUrl = useTask(function* (signal, viewMode: string) {
  try {
    if (isReadOnly && viewMode === 'write') {
      showErrorMessage({ title: $gettext('Cannot open file in edit mode as it is read-only') })
      return
    }

    const fileId = resource.fileId
    const baseUrl = urlJoin(configStore.serverUrl, capabilityStore.filesAppProviders[0].open_url)

    const query = stringify({
      file_id: fileId,
      lang: language.current,
      ...(unref(appName) && { app_name: encodeURIComponent(unref(appName)) }),
      ...(viewMode && { view_mode: viewMode }),
      ...(unref(templateIdQueryValue) && { template_id: unref(templateIdQueryValue) })
    })

    const url = `${baseUrl}?${query}`
    const response = yield makeRequest('POST', url, {
      validateStatus: () => true,
      signal
    })

    if (response.status !== 200) {
      switch (response.status) {
        case 425:
          errorPopup(
            $gettext(
              'This file is currently being processed and is not yet available for use. Please try again shortly.'
            )
          )
          break
        default:
          errorPopup(response.data?.message)
      }

      throw new Error('Error fetching app information')
    }

    if (!response.data.app_url || !response.data.method) {
      throw new Error('Error in app server response')
    }

    appUrl.value = response.data.app_url
    method.value = response.data.method

    if (response.data.form_parameters) {
      formParameters.value = response.data.form_parameters
    }

    if (method.value === 'POST' && formParameters.value) {
      yield nextTick()
      unref(subm).click()
    }
  } catch (e) {
    console.error('web-app-external error', e)
    throw e
  }
}).restartable()

const getSharedDriveItemTask = useTask(function* (signal) {
  try {
    return getSharedDriveItem({ graphClient, spacesStore, space, signal })
  } catch (e) {
    console.error(e)
  }
})

const determineOpenAsPreview = (appName: string) => {
  const openAsPreview = configStore.options.editor.openAsPreview
  return openAsPreview === true || (Array.isArray(openAsPreview) && openAsPreview.includes(appName))
}

const isCollabora = unref(appName)?.toLowerCase()?.startsWith('collabora')

// switch to write mode when edit is clicked
const catchClickMicrosoftEdit = (event: MessageEvent) => {
  try {
    if (JSON.parse(event.data)?.MessageId === 'UI_Edit') {
      loadAppUrl.perform('write')
    }
  } catch {}
}

const handlePostMessagesCollabora = async (event: MessageEvent) => {
  try {
    const message = JSON.parse(event.data || '{}')

    if (message.MessageId === 'App_LoadingStatus') {
      postMessageToCollabora('Hide_Button', { id: 'toggledarktheme' })

      if (message.Values?.Status === 'Frame_Ready') {
        postMessageToCollabora('Host_PostmessageReady')
      }
      return
    }

    if (message.MessageId === 'UI_SaveAs') {
      if (Object.hasOwn(message.Values, 'format')) {
        dispatchModal({
          title: $gettext('Export »%{name}« as %{format}', {
            name: resource.name,
            format: message.Values.format
          }),
          customComponent: FileNameModal,
          customComponentAttrs: () => ({
            space,
            resource,
            fileExtension: message.Values.format,
            callbackFn: (newFileName: string) => {
              postMessageToCollabora('Action_SaveAs', {
                Filename: newFileName,
                Notify: true
              })
            }
          })
        })
        return
      }

      dispatchModal({
        title: $gettext('Save »%{name}« with new name', { name: resource.name }),
        customComponent: FileNameModal,
        customComponentAttrs: () => ({
          space,
          resource,
          callbackFn: (newFileName: string) => {
            postMessageToCollabora('Action_SaveAs', {
              Filename: newFileName,
              Notify: true
            })
          }
        })
      })
      return
    }

    if (message.MessageId === 'Action_Save_Resp') {
      if (!message.Values?.fileName) {
        return
      }

      // FIXME: when we move to id based propfinds we magically need a fileId for the new file. Collabora doesn't provide that.
      const newFile = await webdav.getFileInfo(space, {
        path:
          resource.path.substring(0, resource.path.length - resource.name.length) +
          message.Values.fileName,
        fileId: undefined
      })
      await router.push({
        name: unref(route).name,
        params: {
          ...unref(route).params,
          driveAliasAndItem: queryItemAsString(unref(route).params.driveAliasAndItem).replace(
            resource.name,
            newFile.name
          )
        },
        query: {
          ...unref(route).query,
          fileId: newFile.fileId
        }
      })
      return
    }

    if (message.MessageId === 'UI_InsertGraphic') {
      dispatchModal({
        elementClass: 'file-picker-modal',
        title: $gettext('Insert graphic'),
        customComponent: FilePickerModal,
        hideActions: true,
        customComponentAttrs: () => ({
          parentFolderLink: getParentFolderLink(resource),
          allowedFileTypes: ['image/png', 'image/gif', 'image/jpeg', 'image/svg'],
          callbackFn: async ({ resource }: { resource: Resource }) => {
            const { downloadURL: url } = await webdav.getFileInfo(space, resource, {
              davProperties: [DavProperty.DownloadURL]
            })

            postMessageToCollabora('Action_InsertGraphic', { url })
          }
        }),
        focusTrapInitial: false
      })
    }
  } catch (e) {
    console.debug('Error parsing Collabora PostMessage', e)
  }
}

onMounted(() => {
  if (determineOpenAsPreview(unref(appName))) {
    window.addEventListener('message', catchClickMicrosoftEdit)
  } else {
    window.removeEventListener('message', catchClickMicrosoftEdit)
  }

  if (isCollabora) {
    window.addEventListener('message', handlePostMessagesCollabora)
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('message', catchClickMicrosoftEdit)
  if (isCollabora) {
    window.removeEventListener('message', handlePostMessagesCollabora)
  }
})

const appIframeRef = useTemplateRef<HTMLIFrameElement>('appIframe')
const postMessageToCollabora = (messageId: string, values?: { [key: string]: unknown }): void => {
  if (!unref(appIframeRef)) {
    console.error('Collabora iframe not found')
    return
  }

  return unref(appIframeRef).contentWindow.postMessage(
    JSON.stringify({
      MessageId: messageId,
      SendTime: Date.now(),
      ...(values && { Values: values })
    }),
    '*'
  )
}

watch(
  () => resource,
  async (newResource, oldResource) => {
    if (isSameResource(newResource, oldResource)) {
      return
    }

    let viewMode = 'read'

    if (isShareSpaceResource(space)) {
      // load graph permissions if not already loaded
      if (space.graphPermissions === undefined) {
        const sharedDriveItem = await getSharedDriveItemTask.perform()
        setCurrentUserShareSpacePermissions({
          sharesStore,
          spacesStore,
          space,
          sharedDriveItem
        })
      }

      if (!space.graphPermissions?.includes(GraphSharePermission.readContent)) {
        // secure view
        viewMode = 'view'
      }
    }

    if (!isReadOnly) {
      viewMode = unref(viewModeQueryValue) || 'write'
    }

    if (
      determineOpenAsPreview(unref(appName)) &&
      (isShareSpaceResource(space) || isPublicSpaceResource(space) || isProjectSpaceResource(space))
    ) {
      viewMode = 'view'
    }
    loadAppUrl.perform(viewMode)
  },
  { immediate: true, deep: true }
)
</script>
