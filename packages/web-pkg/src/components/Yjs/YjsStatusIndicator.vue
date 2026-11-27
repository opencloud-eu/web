<template>
  <div
    v-if="isVisible"
    v-oc-tooltip="isOffline ? '' : label"
    class="yjs-status-indicator inline-flex items-center gap-1"
    :class="colorClasses"
    role="img"
    :aria-label="label"
    :data-test-yjs-status="status"
  >
    <oc-icon :key="icon" :name="icon" fill-type="none" size-class="size-2.5" />
    <span
      v-if="isOffline"
      class="yjs-status-indicator-label text-sm leading-none"
      v-text="$gettext('Offline')"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import { hasVisibleYjsStatus, YjsStatus } from '../../composables/yjs'

/**
 * Transport state of a collaborative session. Renders nothing while the session is local
 * only or has not started yet, because there is no collaboration to report on then.
 */
const { status } = defineProps<{
  status: YjsStatus | null
}>()

const { $gettext } = useGettext()

const isVisible = computed(() => hasVisibleYjsStatus(status))
const isOffline = computed(() => status === YjsStatus.Disconnected)

const label = computed(() => {
  if (status === YjsStatus.Connected) {
    return $gettext('Collaboration ready')
  }
  if (status === YjsStatus.Disconnected) {
    return $gettext('Collaboration disconnected')
  }
  if (status === YjsStatus.Connecting) {
    return $gettext('Collaboration connecting...')
  }
  return ''
})

// also the key of the icon: the inline svg loader applies a late response of a previous src, so a
// quick connecting -> disconnected flip could otherwise end up showing the ring
const icon = computed(() => (status === YjsStatus.Connecting ? 'circle-line' : 'circle-fill'))

const colorClasses = computed(() => {
  if (status === YjsStatus.Connected) {
    return 'text-green-700 dark:text-green-400'
  }
  if (status === YjsStatus.Disconnected) {
    return 'text-red-700 dark:text-red-400'
  }
  if (status === YjsStatus.Connecting) {
    return 'text-gray-700 dark:text-gray-400'
  }
  return ''
})
</script>
