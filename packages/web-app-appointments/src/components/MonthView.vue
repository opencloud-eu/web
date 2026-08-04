<template>
  <section
    class="flex h-full min-h-0 flex-col overflow-hidden rounded-tl-lg bg-role-surface"
    data-testid="calendar-month-view"
  >
    <header
      class="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 bg-role-surface px-4 py-3"
    >
      <div class="min-w-0">
        <h1 class="truncate text-xl font-bold" v-text="$gettext('Calendar')" />
      </div>

      <div class="flex items-center justify-center gap-3">
        <h2 class="min-w-52 text-center text-xl font-bold" v-text="monthLabel" />
        <oc-button
          data-testid="calendar-previous-button"
          appearance="raw"
          class="min-w-8 w-8"
          :aria-label="$gettext('Previous month')"
          @click="$emit('previous')"
        >
          <oc-icon name="arrow-left-s" fill-type="line" />
        </oc-button>
        <oc-button
          data-testid="calendar-next-button"
          appearance="raw"
          class="min-w-8 w-8"
          :aria-label="$gettext('Next month')"
          @click="$emit('next')"
        >
          <oc-icon name="arrow-right-s" fill-type="line" />
        </oc-button>
        <oc-button
          data-testid="calendar-today-button"
          appearance="outline"
          size="small"
          @click="$emit('today')"
        >
          <span v-text="$gettext('Today')" />
        </oc-button>
      </div>

      <div />
    </header>

    <div class="grid shrink-0 grid-cols-7 border-b border-role-outline-variant bg-role-surface">
      <div
        v-for="weekday in weekdays"
        :key="weekday"
        class="border-l border-role-outline-variant px-3 py-4 text-center text-sm text-role-on-surface"
        v-text="weekday"
      />
    </div>

    <div v-if="isLoading" class="flex min-h-0 flex-1 items-center justify-center">
      <app-loading-spinner />
    </div>

    <div
      v-else-if="error"
      class="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 text-center"
      data-testid="calendar-month-error"
    >
      <p class="text-lg font-bold" v-text="$gettext('Appointments could not be loaded')" />
    </div>

    <div v-else class="grid min-h-0 flex-1 grid-cols-7 auto-rows-fr">
      <button
        v-for="day in days"
        :key="day.key"
        type="button"
        :class="[
          'calendar-month-day flex min-h-0 flex-col overflow-hidden border-b border-l border-role-outline-variant px-1 py-2 text-left outline-offset-[-2px] transition-colors hover:bg-role-surface-container focus-visible:bg-role-surface-container',
          day.isCurrentMonth ? 'bg-role-surface' : 'bg-role-surface-container',
          { 'calendar-month-day-today': day.isToday }
        ]"
        :data-testid="`calendar-day-${day.key}`"
        @click="$emit('select-date', day.date)"
      >
        <div class="mb-4 flex shrink-0 items-center justify-center">
          <span
            :class="[
              'flex size-6 items-center justify-center rounded-full text-sm text-role-on-surface',
              day.isToday ? 'bg-role-primary-container text-role-on-primary-container' : '',
              !day.isCurrentMonth ? 'text-role-on-surface-variant' : ''
            ]"
            v-text="day.dayOfMonth"
          />
        </div>

        <div class="flex min-h-0 flex-col gap-1">
          <div
            v-for="appointment in appointmentsByDay[day.key]?.slice(0, 3) || []"
            :key="`${appointment.calendarId || ''}:${appointment.id}`"
            class="grid grid-cols-[1fr_auto] gap-2 truncate rounded border-l-4 border-role-primary bg-role-surface-container px-2 py-1 text-xs text-role-on-surface"
            :title="appointment.title"
          >
            <span class="truncate" v-text="appointment.title" />
            <span
              class="truncate text-role-on-surface-variant"
              v-text="formatAppointmentTime(appointment)"
            />
          </div>
          <div
            v-if="(appointmentsByDay[day.key]?.length || 0) > 3"
            class="truncate px-2 py-1 text-xs text-role-on-surface-variant"
            v-text="
              $gettext('+%{count} more', { count: (appointmentsByDay[day.key]?.length || 0) - 3 })
            "
          />
        </div>
      </button>
    </div>

    <div
      v-if="!isLoading && !error && !appointments.length"
      class="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center"
    >
      <div
        class="rounded-md border border-role-outline-variant bg-role-surface px-4 py-2 text-sm text-role-on-surface-variant shadow-sm"
        v-text="$gettext('No appointments in this month')"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import { AppLoadingSpinner } from '@opencloud-eu/web-pkg'
import type { Appointment } from '../types'
import type { CalendarDay } from '../helpers/date'

const props = defineProps<{
  days: CalendarDay[]
  currentMonth: Date
  appointments: Appointment[]
  appointmentsByDay: Record<string, Appointment[]>
  isLoading: boolean
  error: Error | null
}>()

defineEmits<{
  previous: []
  next: []
  today: []
  'select-date': [date: Date]
}>()

const { $gettext } = useGettext()
const weekdays = computed(() => [
  $gettext('Mon'),
  $gettext('Tue'),
  $gettext('Wed'),
  $gettext('Thu'),
  $gettext('Fri'),
  $gettext('Sat'),
  $gettext('Sun')
])

const monthLabel = computed(() => {
  return props.currentMonth.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric'
  })
})

function formatAppointmentTime(appointment: Appointment) {
  if (appointment.allDay) {
    return ''
  }

  const start = new Date(appointment.start)
  const end = new Date(appointment.end)
  const time = start.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  })
  const endTime = end.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  })

  return `${time} - ${endTime}`
}
</script>
