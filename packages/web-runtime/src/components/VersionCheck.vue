<template>
  <div v-if="isLoading" class="flex items-center">
    <span v-text="$gettext('Checking for updates')" />
    <oc-spinner class="ml-1" size="xsmall" />
  </div>
  <div v-else>
    <div v-if="!updateAvailable" class="flex items-center">
      <span v-text="$gettext('Up to date')" />
      <oc-icon class="ml-0.5" name="checkbox-circle" size="xsmall" fill-type="line" />
    </div>
    <div v-else>
      <oc-button
        class="text-role-on-surface-variant"
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
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useTask } from 'vue-concurrency'
import { useGettext } from 'vue3-gettext'
import semver from 'semver'
import { useCapabilityStore, useClientService, useConfigStore } from '@opencloud-eu/web-pkg/src'

export interface UpdateChannelData {
  current_version: string
  url: string
}

export type UpdateChannelName = 'rolling' | 'stable' | `lts${string}`

export type UpdateChannels = Record<UpdateChannelName, UpdateChannelData>

export interface UpdateResponseData {
  channels: UpdateChannels
}

const { $gettext } = useGettext()
const { httpUnAuthenticated } = useClientService()
const capabilityStore = useCapabilityStore()
const configStore = useConfigStore()

//TODO: retrieve channel
const updateAvailable = ref(false)
const updateData = ref<UpdateChannelData>()
const serverEdition = 'rolling'
const currentServerVersion = capabilityStore.status.productversion
const currentServerVersionSanitized = currentServerVersion.split('+')[0]

const isLoading = computed(() => loadVersionsTask.isRunning || !loadVersionsTask.last)
const loadVersionsTask = useTask(function* (signal) {
  try {
    const { data }: { data: UpdateResponseData } = yield httpUnAuthenticated.get(
      `https://update.opencloud. eu/server.json?version=${currentServerVersion}&server=${configStore.serverUrl}`
    )

    // TODO: implement lts comparison

    const newestVersion = data.channels[serverEdition].current_version
    if (semver.gt(newestVersion, currentServerVersionSanitized)) {
      updateAvailable.value = true
      updateData.value = data.channels[serverEdition]
    }
  } catch (error) {
    console.error(error)
  }
}).restartable()

onMounted(() => {
  loadVersionsTask.perform()
})
</script>
