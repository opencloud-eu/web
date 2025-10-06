<template>
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

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useGettext } from 'vue3-gettext'
import semver from 'semver'
import { useCapabilityStore, useConfigStore } from '@opencloud-eu/web-pkg'

export interface UpdateChannelData {
  current_version: string
  url: string
}

const { $gettext } = useGettext()
const capabilityStore = useCapabilityStore()
const configStore = useConfigStore()

const updateAvailable = ref(false)
const hasError = ref(false)
const updateData = ref<UpdateChannelData>()

onMounted(() => {
  if (configStore.updates === undefined) {
    hasError.value = true
    return
  }

  //TODO: retrieve serverEdition
  const serverEdition = 'rolling'
  const currentServerVersion = capabilityStore.status.productversion
  const currentServerVersionSanitized = currentServerVersion.split('+')[0]

  const newestVersion = configStore.updates.channels[serverEdition].current_version
  if (semver.gt(newestVersion, currentServerVersionSanitized)) {
    updateAvailable.value = true
    updateData.value = configStore.updates.channels[serverEdition]
  }
})
</script>
