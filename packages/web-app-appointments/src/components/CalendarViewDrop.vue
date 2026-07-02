<template>
  <oc-drop :toggle="toggle" mode="click" padding-size="small" close-on-click class="min-w-48">
    <ul class="m-0 list-none p-0">
      <li v-for="mode in viewModes" :key="mode.id">
        <oc-button
          appearance="raw-inverse"
          color-role="surface"
          justify-content="left"
          class="w-full"
          :class="{ 'bg-role-secondary-container': viewMode === mode.id }"
          @click="setViewMode(mode.id)"
        >
          <span v-text="$gettext(mode.label)" />
        </oc-button>
      </li>
    </ul>
  </oc-drop>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAppointmentsStore } from '../composables/piniaStores/appointments'
import type { CalendarViewMode } from '../types'

defineProps<{
  toggle: string
}>()

const appointmentsStore = useAppointmentsStore()
const { viewMode } = storeToRefs(appointmentsStore)
const { setViewMode } = appointmentsStore

const viewModes: { id: CalendarViewMode; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: '3-day', label: '3-Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'agenda', label: 'Agenda' }
]
</script>
