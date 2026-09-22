<template>
  <div
    v-if="isVisible"
    v-oc-tooltip="label"
    class="yjs-status-indicator inline-flex items-center"
    :aria-label="label"
    :data-test-yjs-status="status"
  >
    <span
      class="inline-flex size-6 items-center justify-center rounded-full border"
      :class="statusClasses"
    >
      <oc-icon :name="icon" fill-type="line" size-class="size-4" />
    </span>
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

const icon = computed(() => (status === YjsStatus.Disconnected ? 'wifi-off' : 'wifi'))

const statusClasses = computed(() => {
  if (status === YjsStatus.Connected) {
    return 'border-green-700/20 bg-green-500/15 text-green-700'
  }
  if (status === YjsStatus.Disconnected) {
    return 'border-red-700/20 bg-red-500/15 text-red-700'
  }
  if (status === YjsStatus.Connecting) {
    return 'border-gray-700/20 bg-gray-500/15 text-gray-700'
  }
  return ''
})
</script>
