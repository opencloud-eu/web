<template>
  <div v-if="isLoading" class="oc-height-1-1 oc-width-1-1 oc-flex oc-flex-center oc-flex-middle">
    <oc-spinner size="large" />
  </div>
  <iframe
    v-else-if="appUrl && method === 'GET'"
    :src="appUrl"
    class="oc-width-1-1 oc-height-1-1"
    :title="iFrameTitle"
    allowfullscreen
  />
  <div v-if="appUrl && method === 'POST' && formParameters" class="oc-height-1-1 oc-width-1-1">
    <form :action="appUrl" target="app-iframe" method="post">
      <input ref="subm" type="submit" :value="formParameters" class="oc-hidden" />
      <div v-for="(item, key, index) in formParameters" :key="index">
        <input :name="key" :value="item" type="hidden" />
      </div>
    </form>
    <iframe
      name="app-iframe"
      class="oc-width-1-1 oc-height-1-1"
      :title="iFrameTitle"
      allowfullscreen
    />
  </div>
</template>

<script setup lang="ts">
import { stringify } from 'qs'
import { computed, unref, nextTick, ref, watch, onMounted, useTemplateRef } from 'vue'
import { useTask } from 'vue-concurrency'
import { useGettext } from 'vue3-gettext'
import isEmpty from 'lodash-es/isEmpty'
import {
  getPermissionsForSpaceMember,
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
  useUserStore,
  getSharedDriveItem,
  setCurrentUserShareSpacePermissions,
  useSpacesStore,
  useClientService,
  useSharesStore
} from '@opencloud-eu/web-pkg'

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
const appProviderService = useAppProviderService()
const { makeRequest } = useRequest()
const userStore = useUserStore()
const spacesStore = useSpacesStore()
const sharesStore = useSharesStore()
const { graphAuthenticated: graphClient } = useClientService()

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
const formParameters = ref({})
const method = ref<string>()
const subm = useTemplateRef<HTMLInputElement>('subm')
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

// switch to write mode when edit is clicked
const catchClickMicrosoftEdit = (event: MessageEvent) => {
  try {
    if (JSON.parse(event.data)?.MessageId === 'UI_Edit') {
      loadAppUrl.perform('write')
    }
  } catch {}
}
onMounted(() => {
  if (determineOpenAsPreview(unref(appName))) {
    window.addEventListener('message', catchClickMicrosoftEdit)
  } else {
    window.removeEventListener('message', catchClickMicrosoftEdit)
  }
})

watch(
  [resource],
  async ([newResource], [oldResource]) => {
    if (isSameResource(newResource, oldResource)) {
      return
    }

    let viewMode = 'read'

    if (isShareSpaceResource(space)) {
      // add current user as space member if not already loaded by the space loader
      if (isEmpty(space.members)) {
        const sharedDriveItem = await getSharedDriveItemTask.perform()
        setCurrentUserShareSpacePermissions({
          sharesStore,
          spacesStore,
          userStore,
          space,
          sharedDriveItem
        })
      }

      const permissions = getPermissionsForSpaceMember(space, userStore.user)
      if (!permissions.includes(GraphSharePermission.readContent)) {
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
