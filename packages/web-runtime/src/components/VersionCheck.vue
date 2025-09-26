<template>
  <div v-if="isLoading" class="version-check-loading flex items-center">
    <span v-text="$gettext('Checking for updates')" />
    <oc-spinner class="ml-1" size="xsmall" />
  </div>
  <template v-else>
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
  </template>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useTask } from 'vue-concurrency'
import { useGettext } from 'vue3-gettext'
import semver from 'semver'
import { useCapabilityStore, useClientService, useConfigStore } from '@opencloud-eu/web-pkg/src'
import { promiseTimeout } from '@vueuse/core'

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

const updateAvailable = ref(false)
const hasError = ref(false)
const updateData = ref<UpdateChannelData>()
//TODO: retrieve serverEdition
const serverEdition = 'rolling'
const currentServerVersion = capabilityStore.status.productversion
const currentServerVersionSanitized = currentServerVersion.split('+')[0]

const hasMinLoadingTimePassed = ref(false)
const isLoading = computed(
  () => loadVersionsTask.isRunning || !loadVersionsTask.last || !hasMinLoadingTimePassed.value
)

const loadVersionsTask = useTask(function* (signal) {
  promiseTimeout(1000).then(() => {
    hasMinLoadingTimePassed.value = true
  })

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
  }
}).restartable()

onMounted(() => {
  loadVersionsTask.perform()
})
</script>
