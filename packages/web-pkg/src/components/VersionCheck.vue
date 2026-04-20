<template>
  <div v-if="isEnabled">
    <div v-if="isLoading" class="version-check-loading flex items-center">
      <span v-text="$gettext('Checking for updates')" />
      <oc-spinner class="ml-1" size="xsmall" />
    </div>
    <template v-else>
      <div v-if="!updateAvailable" class="version-check-no-updates flex items-center">
        <span v-text="$gettext('Up to date')" />
        <oc-icon class="ml-0.5" name="checkbox-circle" size="xsmall" fill-type="line" />
      </div>
      <oc-button
        v-else
        class="version-check-update text-role-on-surface-variant"
        size="small"
        type="a"
        :href="updateData.url"
        target="_blank"
        gap-size="small"
        appearance="raw"
        no-hover
      >
        <span
          class="text-xs"
          v-text="$gettext('Version %{version} available', { version: updateData.current_version })"
        />
        <oc-icon name="refresh" size="xsmall" fill-type="line" />
      </oc-button>
      <oc-tag
        v-if="showCritical"
        class="version-check-critical !bg-red-200 !text-red-900 border-0 ml-1"
        size="small"
      >
        <span v-text="$gettext('Critical')" />
      </oc-tag>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, unref, computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'
import { useAbility, useCapabilityStore, useUpdatesStore } from '../composables'
import { UpdateChannel } from '../types'
import { compareVersions } from '../utils'

const { $gettext } = useGettext()
const capabilityStore = useCapabilityStore()
const ability = useAbility()
const updatesStore = useUpdatesStore()
const { setHasError } = updatesStore

const checkForUpdates = capabilityStore.capabilities.core['check-for-updates']
const { updates, isLoading, hasError } = storeToRefs(updatesStore)

const isEnabled = computed(() => {
  return checkForUpdates && !unref(hasError)
})

const updateAvailable = ref(false)
const updateData = ref<UpdateChannel>()

const serverEdition = capabilityStore.status.edition || 'rolling'
const currentServerVersion = capabilityStore.status.productversion
const currentServerVersionSanitized = currentServerVersion.split('+')[0]

const showCritical = computed(() => {
  return (
    unref(updateData)?.critical.includes(currentServerVersionSanitized) &&
    ability.can('read-all', 'Setting')
  )
})

watch(
  () => updates,
  () => {
    if (!unref(updates)) {
      return
    }
    try {
      updateData.value = unref(updates).channels[serverEdition]
      const newestVersion = unref(updates).channels[serverEdition].current_version
      if (compareVersions(newestVersion, currentServerVersionSanitized) > 0) {
        updateAvailable.value = true
      }
    } catch (e) {
      console.error(e)
      setHasError(true)
    }
  },
  { immediate: true, deep: true }
)
</script>
