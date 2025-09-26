<template>
  <div v-if="isLoading" class="version-check-loading flex items-center">
    <span v-text="$gettext('Checking for updates')" />
    <oc-spinner class="ml-1" size="xsmall" />
  </div>
  <div v-else>
    <div v-if="hasError" class="version-check-error flex items-center">
      <span v-text="$gettext('Version check failed')" />
      <oc-icon class="ml-0.5" name="close-circle" size="xsmall" fill-type="line" />
    </div>
    <div v-else-if="!updateAvailable" class="version-check-no-updates flex items-center">
      <span v-text="$gettext('Up to date')" />
      <oc-icon class="ml-0.5" name="checkbox-circle" size="xsmall" fill-type="line" />
    </div>
    <oc-button
      v-else
      class="version-check-update text-role-on-surface-variant"
      size="small"
      type="router-link"
      :href="updateData.url"
      target="_blank"
      gap-size="small"
      appearance="raw"
    >
      <span
        class="text-xs"
        v-text="$gettext('Version %{version} available', { version: updateData.current_version })"
      />
      <oc-icon name="refresh" size="xsmall" fill-type="line" />
    </oc-button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useTask } from 'vue-concurrency'
import { useGettext } from 'vue3-gettext'
import semver from 'semver'
import { debounce } from 'lodash-es'
import { useCapabilityStore, useClientService, useConfigStore } from '@opencloud-eu/web-pkg/src'

export interface UpdateChannelData {
  current_version: string
  url: string
}

export type UpdateChannelName = 'rolling' | 'production'

export type UpdateChannels = Record<UpdateChannelName, UpdateChannelData>

export interface UpdateResponseData {
  channels: UpdateChannels
}

const { $gettext } = useGettext()
const { httpUnAuthenticated } = useClientService()
const capabilityStore = useCapabilityStore()
const configStore = useConfigStore()

const isLoading = ref(true)
const updateAvailable = ref(false)
const hasError = ref(false)
const updateData = ref<UpdateChannelData>()
//TODO: retrieve serverEdition
const serverEdition = 'rolling'
const currentServerVersion = capabilityStore.status.productversion
const currentServerVersionSanitized = currentServerVersion.split('+')[0]

const stopLoading = debounce(() => {
  isLoading.value = false
}, 1000)

const loadVersionsTask = useTask(function* (signal) {
  try {
    const { data }: { data: UpdateResponseData } = yield httpUnAuthenticated.get(
      `https://update.opencloud.eu/server.json`,
      {
        params: {
          server: configStore.serverUrl,
          edition: serverEdition,
          version: currentServerVersion
        }
      }
    )

    const newestVersion = data.channels[serverEdition].current_version
    if (semver.gt(newestVersion, currentServerVersionSanitized)) {
      updateAvailable.value = true
      updateData.value = data.channels[serverEdition]
    }
  } catch (error) {
    console.error(error)
    hasError.value = true
  } finally {
    stopLoading()
  }
}).restartable()

onMounted(() => {
  loadVersionsTask.perform()
})
</script>
