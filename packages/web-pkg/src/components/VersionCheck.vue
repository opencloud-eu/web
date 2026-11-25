<template>
  <div
    v-if="isEnabled || $slots.default"
    class="flex flex-col font-normal"
    :class="{
      'version-check-update': showUpdate,
      'rounded-xl bg-red-100 px-4 py-3 text-red-900 dark:bg-red-950 dark:text-red-100':
        showCritical,
      'text-role-on-surface-variant': !showCritical
    }"
  >
    <span
      v-if="showCritical"
      class="version-check-critical mb-1 font-semibold text-red-700 dark:text-red-300"
      v-text="$gettext('Critical update')"
    />
    <template v-if="isEnabled">
      <span v-if="isLoading" class="version-check-loading flex items-center">
        <span v-text="$gettext('Checking for updates')" />
        <oc-spinner class="ms-1" size="xsmall" />
      </span>
      <a
        v-else-if="showUpdate"
        class="inline-flex items-center gap-1 text-inherit hover:underline"
        :href="updateData.url"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span
          v-text="$gettext('Version %{version} available', { version: updateData.current_version })"
        />
        <oc-icon name="refresh" size-class="size-3" fill-type="line" />
      </a>
      <span v-else class="version-check-no-updates flex items-center">
        <span v-text="$gettext('Up to date')" />
        <oc-icon class="ms-0.5" name="checkbox-circle" size-class="size-3" fill-type="line" />
      </span>
    </template>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, unref, computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import { storeToRefs } from 'pinia'
import { useAbility, useCapabilityStore, useUpdatesStore } from '../composables'
import { UpdateChannel } from '../types'
import { compareVersions, satisfiesVersionRange } from '../utils'

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

function isCriticalVersion({ critical_range }: UpdateChannel) {
  if (!critical_range) {
    return false
  }
  try {
    return satisfiesVersionRange(currentServerVersionSanitized, critical_range)
  } catch (e) {
    console.error(e)
    return false
  }
}

const showUpdate = computed(() => unref(isEnabled) && !unref(isLoading) && unref(updateAvailable))

const showCritical = computed(() => {
  if (!unref(showUpdate) || !ability.can('read-all', 'Setting')) {
    return false
  }
  return isCriticalVersion(unref(updateData))
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
