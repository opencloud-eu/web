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
import { ref, watch, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import semver from 'semver'
import { UpdateChannel, useCapabilityStore, useUpdatesStore } from '@opencloud-eu/web-pkg'
import { storeToRefs } from 'pinia'

const { $gettext } = useGettext()
const capabilityStore = useCapabilityStore()
const updatesStore = useUpdatesStore()

const { updates, isLoading, hasError } = storeToRefs(updatesStore)

const updateAvailable = ref(false)
const updateData = ref<UpdateChannel>()

//TODO: retrieve serverEdition
const serverEdition = 'rolling'
const currentServerVersion = capabilityStore.status.productversion
const currentServerVersionSanitized = currentServerVersion.split('+')[0]

watch(
  () => updates,
  () => {
    if (!unref(updates)) {
      return
    }
    const newestVersion = unref(updates).channels[serverEdition].current_version
    if (semver.gt(newestVersion, currentServerVersionSanitized)) {
      updateAvailable.value = true
      updateData.value = unref(updates).channels[serverEdition]
    }
  },
  { immediate: true, deep: true }
)
</script>
