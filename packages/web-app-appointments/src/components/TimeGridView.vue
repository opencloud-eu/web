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
        <oc-button id="calendar-time-view-toggle" appearance="outline" size="small">
          <span v-text="viewModeLabel" />
          <oc-icon name="arrow-down-s" fill-type="line" />
        </oc-button>
        <CalendarViewDrop toggle="#calendar-time-view-toggle" />
      </div>
    </header>

    <div v-if="isLoading" class="flex min-h-0 flex-1 items-center justify-center">
      <app-loading-spinner />
    </div>
    <div
      v-else-if="error"
      class="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 text-center"
    >
      <p class="text-lg font-bold" v-text="$gettext('Appointments could not be loaded')" />
      <p class="text-role-on-surface-variant" v-text="error.message" />
    </div>
    <div
      v-else
      class="grid min-h-0 flex-1 grid-cols-[72px_1fr] overflow-hidden border-t border-role-outline-variant"
    >
      <div class="border-r border-role-outline-variant">
        <div
          class="h-12 border-b border-role-outline-variant px-4 py-4 text-sm"
          v-text="$gettext('Time')"
        />
        <div
          v-for="hour in hours"
          :key="hour"
          class="h-24 border-b border-role-outline-variant px-3 py-2 text-right text-sm text-role-on-surface-variant"
          v-text="formatHour(hour)"
        />
      </div>
      <div
        class="grid min-w-0"
        :style="{ gridTemplateColumns: `repeat(${visibleDays.length}, minmax(0, 1fr))` }"
      >
        <div
          v-for="day in visibleDays"
          :key="day.key"
          class="relative min-w-0 border-r border-role-outline-variant"
        >
          <div
            class="flex h-12 items-center justify-center gap-2 border-b border-role-outline-variant text-sm"
          >
            <span
              :class="[
                'flex size-6 items-center justify-center rounded-full',
                day.isToday ? 'bg-role-primary-container text-role-on-primary-container' : ''
              ]"
              v-text="day.dayOfMonth"
            />
            <span v-text="day.weekday" />
          </div>
          <div
            v-for="hour in hours"
            :key="`${day.key}-${hour}`"
            class="h-24 border-b border-role-outline-variant"
            :class="{ 'bg-role-surface-container': day.isToday && hour === 9 }"
          />
          <div class="absolute inset-x-1 top-12">
            <div
              v-for="appointment in appointmentsByDay[day.key] || []"
              :key="appointment.id"
              class="absolute inset-x-0 grid grid-cols-[1fr_auto] gap-2 rounded border-l-4 border-role-primary bg-role-surface-container px-2 py-1 text-xs text-role-on-surface"
              :style="getAppointmentStyle(appointment)"
              :title="appointment.title"
            >
              <span class="truncate" v-text="appointment.title" />
              <span
                class="truncate text-role-on-surface-variant"
                v-text="formatAppointmentTime(appointment)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AppLoadingSpinner } from '@opencloud-eu/web-pkg'
import type { Appointment, CalendarViewMode } from '../types'
import type { CalendarDay } from '../helpers/date'
import { getMonthGridDays, toDateKey } from '../helpers/date'
import CalendarViewDrop from './CalendarViewDrop.vue'

const props = defineProps<{
  currentMonth: Date
  selectedDate: Date
  appointmentsByDay: Record<string, Appointment[]>
  isLoading: boolean
  error: Error | null
  viewMode: CalendarViewMode
}>()

defineEmits<{
  previous: []
  next: []
  today: []
}>()

const hours = [8, 9, 10, 11, 12, 13, 14, 15]

const visibleDays = computed(() => {
  if (props.viewMode === 'day') {
    return [dayFromDate(props.selectedDate)]
  }

  if (props.viewMode === '3-day') {
    return [0, 1, 2].map((offset) => dayFromDate(addDays(props.selectedDate, offset)))
  }

  const monday = addDays(props.selectedDate, -((props.selectedDate.getDay() + 6) % 7))
  return [0, 1, 2, 3, 4, 5, 6].map((offset) => dayFromDate(addDays(monday, offset)))
})

const monthLabel = computed(() => {
  return props.currentMonth.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric'
  })
})

const viewModeLabel = computed(() => {
  const labels: Record<CalendarViewMode, string> = {
    day: 'Day',
    '3-day': '3-Day',
    week: 'Week',
    month: 'Month',
    agenda: 'Agenda'
  }

  return labels[props.viewMode]
})

const dayFromDate = (date: Date): CalendarDay & { weekday: string } => {
  const [day] = getMonthGridDays(date, new Date()).filter(
    (item) => toDateKey(item.date) === toDateKey(date)
  )
  return {
    ...day,
    weekday: date.toLocaleDateString(undefined, { weekday: 'short' })
  }
}

const addDays = (date: Date, amount: number) => {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

const formatHour = (hour: number) => `${String(hour).padStart(2, '0')}:00`

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

const getAppointmentStyle = (appointment: Appointment) => {
  const start = new Date(appointment.start)
  const end = new Date(appointment.end)
  const startMinutes = start.getHours() * 60 + start.getMinutes()
  const endMinutes = end.getHours() * 60 + end.getMinutes()
  const firstMinute = hours[0] * 60
  const top = Math.max(startMinutes - firstMinute, 0) * 1.6
  const height = Math.max((endMinutes - startMinutes) * 1.6, 24)

  return {
    top: `${top}px`,
    minHeight: `${height}px`
  }
}
</script>
