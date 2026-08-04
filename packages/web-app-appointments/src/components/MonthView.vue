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

    <div
      class="grid shrink-0 grid-cols-7 border-b border-role-outline-variant bg-role-surface"
      role="row"
    >
      <div
        v-for="weekday in weekdays"
        :key="weekday"
        class="border-l border-role-outline-variant px-3 py-4 text-center text-sm text-role-on-surface"
        role="columnheader"
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

    <div v-else class="grid min-h-0 flex-1 grid-cols-7 auto-rows-fr" role="grid">
      <div
        v-for="day in days"
        :key="day.key"
        :class="[
          'flex min-h-0 flex-col overflow-hidden border-b border-l border-role-outline-variant px-1 py-2 text-left',
          day.isCurrentMonth ? 'bg-role-surface' : 'bg-role-surface-container'
        ]"
        :data-is-today="day.isToday || undefined"
        :data-testid="`calendar-day-cell-${day.key}`"
        role="gridcell"
      >
        <div class="mb-4 flex shrink-0 items-center justify-center">
          <button
            type="button"
            :class="[
              'flex size-6 items-center justify-center rounded-full text-sm text-role-on-surface outline-offset-2 hover:bg-role-surface-container-highest focus-visible:outline focus-visible:outline-role-outline',
              day.isToday ? 'bg-role-primary-container text-role-on-primary-container' : '',
              !day.isCurrentMonth ? 'text-role-on-surface-variant' : ''
            ]"
            :aria-label="formatDayLabel(day.date)"
            :data-testid="`calendar-day-${day.key}`"
            @click="$emit('select-date', day.date)"
            v-text="day.dayOfMonth"
          />
        </div>

        <div class="flex min-h-0 flex-col gap-1">
          <button
            v-for="occurrence in occurrencesByDay[day.key]?.slice(0, 3) || []"
            :key="occurrence.id"
            type="button"
            class="grid w-full grid-cols-[1fr_auto] gap-2 truncate rounded border-l-4 bg-role-surface-container px-2 py-1 text-left text-xs text-role-on-surface hover:bg-role-surface-container-highest focus-visible:outline focus-visible:outline-role-outline"
            :style="{
              borderColor: resolveAppointmentColor(
                occurrence.appointment,
                calendarColorById[occurrence.calendarId || '']
              )
            }"
            :title="occurrence.appointment.title"
            :data-testid="`calendar-appointment-${occurrence.id}`"
            @click="$emit('select-appointment', occurrence.id)"
          >
            <span
              class="truncate"
              v-text="occurrence.appointment.title || $gettext('Untitled appointment')"
            />
            <span
              class="truncate text-role-on-surface-variant"
              v-text="formatOccurrenceTime(occurrence)"
            />
          </button>
          <div
            v-if="(occurrencesByDay[day.key]?.length || 0) > 3"
            class="truncate px-2 py-1 text-xs text-role-on-surface-variant"
            v-text="
              $gettext('+%{count} more', { count: (occurrencesByDay[day.key]?.length || 0) - 3 })
            "
          />
        </div>
      </div>
    </div>

    <div
      v-if="!isLoading && !error && !visibleOccurrences.length"
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
import { AppLoadingSpinner, formatDateFromJSDate } from '@opencloud-eu/web-pkg'
import { DateTime } from 'luxon'
import { resolveAppointmentColor } from '../helpers/color'
import { formatOccurrenceTimeRange, type CalendarDay } from '../helpers/date'
import type { AppointmentOccurrence } from '../types'

const props = defineProps<{
  days: CalendarDay[]
  currentMonth: Date
  visibleOccurrences: AppointmentOccurrence[]
  occurrencesByDay: Record<string, AppointmentOccurrence[]>
  calendarColorById: Record<string, string | undefined>
  isLoading: boolean
  error: Error | null
}>()

defineEmits<{
  previous: []
  next: []
  today: []
  'select-date': [date: Date]
  'select-appointment': [id: string]
}>()

const { $gettext, current: currentLanguage } = useGettext()
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
  return formatDateFromJSDate(props.currentMonth, currentLanguage, {
    month: 'long',
    year: 'numeric'
  })
})

function formatOccurrenceTime(occurrence: AppointmentOccurrence) {
  if (occurrence.appointment.allDay) {
    return $gettext('All day')
  }

  return formatOccurrenceTimeRange(occurrence, currentLanguage)
}

function formatDayLabel(date: Date) {
  return formatDateFromJSDate(date, currentLanguage, DateTime.DATE_FULL)
}
</script>
