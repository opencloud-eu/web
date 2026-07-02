<template>
  <section class="flex h-full min-h-0 flex-col overflow-hidden rounded-tl-lg bg-role-surface">
    <header
      class="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 bg-role-surface px-4 py-3"
    >
      <div class="min-w-0">
        <h1 class="truncate text-xl font-bold" v-text="$gettext('Calendar')" />
      </div>

      <div class="flex items-center justify-center gap-3">
        <h2 class="min-w-52 text-center text-xl font-bold" v-text="monthLabel" />
        <oc-button
          appearance="raw"
          class="min-w-8 w-8"
          :aria-label="$gettext('Previous')"
          @click="$emit('previous')"
        >
          <oc-icon name="arrow-left-s" fill-type="line" />
        </oc-button>
        <oc-button
          appearance="raw"
          class="min-w-8 w-8"
          :aria-label="$gettext('Next')"
          @click="$emit('next')"
        >
          <oc-icon name="arrow-right-s" fill-type="line" />
        </oc-button>
        <oc-button appearance="outline" size="small" @click="$emit('today')">
          <span v-text="$gettext('Today')" />
        </oc-button>
      </div>

      <div class="flex items-center justify-end gap-3">
        <oc-button id="calendar-agenda-view-toggle" appearance="outline" size="small">
          <span v-text="$gettext('Agenda')" />
          <oc-icon name="arrow-down-s" fill-type="line" />
        </oc-button>
        <CalendarViewDrop toggle="#calendar-agenda-view-toggle" />
      </div>
    </header>

    <div class="min-h-0 flex-1 overflow-auto border-t border-role-outline-variant">
      <div
        v-if="!appointments.length"
        class="flex h-full items-center justify-center px-6 text-center text-role-on-surface-variant"
        v-text="$gettext('No appointments in this range')"
      />
      <ul v-else class="m-0 list-none divide-y divide-role-outline-variant p-0">
        <li
          v-for="appointment in appointments"
          :key="appointment.id"
          class="grid grid-cols-[9rem_1fr] gap-4 px-6 py-4"
        >
          <div class="text-sm text-role-on-surface-variant">
            <div class="font-semibold text-role-on-surface" v-text="formatDay(appointment.start)" />
            <div v-text="formatAppointmentTime(appointment)" />
          </div>
          <div class="min-w-0">
            <p class="m-0 truncate font-semibold" v-text="appointment.title" />
            <p
              v-if="appointment.location"
              class="m-0 truncate text-sm text-role-on-surface-variant"
              v-text="appointment.location"
            />
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Appointment } from '../types'
import CalendarViewDrop from './CalendarViewDrop.vue'

const props = defineProps<{
  currentMonth: Date
  appointments: Appointment[]
}>()

defineEmits<{
  previous: []
  next: []
  today: []
}>()

const monthLabel = computed(() => {
  return props.currentMonth.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric'
  })
})

const formatDay = (value: string) => {
  return new Date(value).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
}

const formatAppointmentTime = (appointment: Appointment) => {
  if (appointment.allDay) {
    return ''
  }

  const start = new Date(appointment.start)
  const end = new Date(appointment.end)
  return `${formatHourMinute(start)} - ${formatHourMinute(end)}`
}

const formatHourMinute = (date: Date) => {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>
