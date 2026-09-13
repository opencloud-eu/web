<template>
  <section
    class="relative flex h-full min-h-0 flex-col overflow-hidden rounded-tl-lg bg-role-surface"
    data-testid="calendar-month-view"
  >
    <header
      class="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 bg-role-surface px-4 py-3"
    >
      <div class="min-w-0">
        <h1 class="truncate text-xl font-bold" v-text="$gettext('Appointments')" />
      </div>

      <div class="flex items-center justify-center gap-3">
        <h2 :id="monthLabelId" class="min-w-52 text-center text-xl font-bold" v-text="monthLabel" />
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
        :key="weekday.key"
        class="border-l border-role-outline-variant px-3 py-4 text-center text-sm text-role-on-surface"
        role="columnheader"
        :aria-label="weekday.fullLabel"
        v-text="weekday.label"
      />
    </div>

    <div
      v-if="isLoading"
      class="flex min-h-0 flex-1 items-center justify-center"
      data-testid="calendar-loading"
    >
      <app-loading-spinner />
    </div>

    <div
      v-else-if="error"
      class="flex min-h-0 flex-1 items-center justify-center overflow-auto"
      data-testid="calendar-month-error"
    >
      <no-content-message icon="calendar" icon-fill-type="line">
        <template #message>
          <span v-text="$gettext('Appointments could not be loaded')" />
        </template>
      </no-content-message>
    </div>

    <div
      v-else
      ref="grid"
      class="grid min-h-0 flex-1 grid-cols-7 auto-rows-fr"
      role="grid"
      :aria-labelledby="monthLabelId"
      @keydown="onGridKeydown"
    >
      <div
        v-for="day in days"
        :key="day.key"
        :class="[
          'group flex min-h-0 cursor-pointer flex-col overflow-hidden border-b border-l border-role-outline-variant px-1 py-2 text-left',
          day.isCurrentMonth ? 'bg-role-surface' : 'bg-role-surface-container'
        ]"
        :tabindex="day.key === activeDayKey ? 0 : -1"
        :aria-label="formatDayLabel(day.date)"
        :data-is-today="day.isToday || undefined"
        :data-testid="`calendar-day-cell-${day.key}`"
        role="gridcell"
        @click="selectDay(day)"
      >
        <div class="mb-4 flex shrink-0 items-center justify-center">
          <span
            :class="[
              'flex size-6 items-center justify-center rounded-full text-sm text-role-on-surface group-hover:bg-role-surface-container-highest',
              day.isToday ? 'bg-role-primary-container text-role-on-primary-container' : '',
              !day.isCurrentMonth ? 'text-role-on-surface-variant' : ''
            ]"
            aria-hidden="true"
            v-text="day.dayOfMonth"
          />
        </div>

        <div class="flex min-h-0 flex-col gap-1">
          <button
            v-for="occurrence in getVisibleOccurrences(day.key)"
            :key="occurrence.id"
            type="button"
            class="grid w-full grid-cols-[1fr_auto] gap-2 truncate rounded border-l-4 bg-role-surface-container px-2 py-1 text-left text-xs text-role-on-surface hover:bg-role-surface-container-highest"
            :style="{
              borderColor: resolveAppointmentColor(
                occurrence.appointment,
                calendarColorById[occurrence.calendarId || '']
              )
            }"
            :title="occurrence.appointment.title"
            :data-testid="`calendar-appointment-${occurrence.id}`"
            @click.stop="$emit('select-appointment', occurrence.id)"
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
            v-if="getHiddenOccurrenceCount(day.key)"
            class="truncate px-2 py-1 text-xs text-role-on-surface-variant"
            v-text="$gettext('+%{count} more', { count: getHiddenOccurrenceCount(day.key) })"
          />
        </div>
      </div>
    </div>

    <div
      v-if="!isLoading && !error && !hasOccurrences"
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
import { computed, nextTick, ref, unref, useId, useTemplateRef, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import { AppLoadingSpinner, NoContentMessage, formatDateFromJSDate } from '@opencloud-eu/web-pkg'
import { DateTime, Info } from 'luxon'
import { resolveAppointmentColor } from '../helpers/color'
import { formatOccurrenceTimeRange, type CalendarDay } from '../helpers/date'
import type { AppointmentOccurrence } from '../types'

const DAYS_PER_WEEK = 7
const MAX_OCCURRENCES_PER_DAY = 3

const {
  days,
  currentMonth,
  occurrencesByDay,
  calendarColorById,
  isLoading,
  error = undefined
} = defineProps<{
  days: CalendarDay[]
  currentMonth: Date
  occurrencesByDay: Record<string, AppointmentOccurrence[]>
  calendarColorById: Record<string, string | undefined>
  isLoading: boolean
  error?: Error
}>()

const emit = defineEmits<{
  previous: []
  next: []
  today: []
  'select-date': [date: Date]
  'select-appointment': [id: string]
}>()

const { $gettext, current: currentLanguage } = useGettext()
const monthLabelId = useId()

const weekdays = computed(() => {
  const fullLabels = Info.weekdays('long', { locale: currentLanguage })

  return Info.weekdays('short', { locale: currentLanguage }).map((label, index) => ({
    key: fullLabels[index],
    label,
    fullLabel: fullLabels[index]
  }))
})

const hasOccurrences = computed(() => Object.keys(occurrencesByDay).length > 0)

const monthLabel = computed(() => {
  return formatDateFromJSDate(currentMonth, currentLanguage, {
    month: 'long',
    year: 'numeric'
  })
})

const getVisibleOccurrences = (dateKey: string) => {
  return (occurrencesByDay[dateKey] || []).slice(0, MAX_OCCURRENCES_PER_DAY)
}

const getHiddenOccurrenceCount = (dateKey: string) => {
  return Math.max((occurrencesByDay[dateKey] || []).length - MAX_OCCURRENCES_PER_DAY, 0)
}

const formatOccurrenceTime = (occurrence: AppointmentOccurrence) => {
  if (occurrence.appointment.allDay) {
    return $gettext('All day')
  }

  return formatOccurrenceTimeRange(occurrence, currentLanguage)
}

const formatDayLabel = (date: Date) => {
  return formatDateFromJSDate(date, currentLanguage, DateTime.DATE_FULL)
}

/**
 * The month grid is a single tab stop. Which day cell is tabbable moves with the arrow keys
 * (roving tabindex), so reaching the appointments does not require tabbing through every day.
 */
const grid = useTemplateRef<HTMLElement>('grid')
const activeDayKey = ref<string>()

const activeDayIndex = computed(() => days.findIndex(({ key }) => key === unref(activeDayKey)))

watch(
  () => days,
  () => {
    activeDayKey.value =
      days.find(({ isToday, isCurrentMonth }) => isToday && isCurrentMonth)?.key ||
      days.find(({ isCurrentMonth }) => isCurrentMonth)?.key
  },
  { immediate: true }
)

const selectDay = (day: CalendarDay) => {
  activeDayKey.value = day.key
  emit('select-date', day.date)
}

const focusDay = async (index: number) => {
  const day = days[Math.min(Math.max(index, 0), days.length - 1)]
  if (!day) {
    return
  }

  activeDayKey.value = day.key
  await nextTick()
  unref(grid)?.querySelector<HTMLElement>(`[data-testid="calendar-day-cell-${day.key}"]`)?.focus()
}

const onGridKeydown = (event: KeyboardEvent) => {
  // Appointments inside a cell are regular tab stops and bring their own keyboard handling.
  if ((event.target as HTMLElement).getAttribute('role') !== 'gridcell') {
    return
  }

  const index = unref(activeDayIndex)
  if (index < 0) {
    return
  }

  switch (event.key) {
    case 'ArrowLeft':
      focusDay(index - 1)
      break
    case 'ArrowRight':
      focusDay(index + 1)
      break
    case 'ArrowUp':
      focusDay(index - DAYS_PER_WEEK)
      break
    case 'ArrowDown':
      focusDay(index + DAYS_PER_WEEK)
      break
    case 'Home':
      focusDay(index - (index % DAYS_PER_WEEK))
      break
    case 'End':
      focusDay(index + DAYS_PER_WEEK - 1 - (index % DAYS_PER_WEEK))
      break
    case 'PageUp':
      emit('previous')
      break
    case 'PageDown':
      emit('next')
      break
    case 'Enter':
    case ' ':
      selectDay(days[index])
      break
    default:
      return
  }

  event.preventDefault()
}
</script>

<style scoped>
/*
 * The global focus ring of the design system is drawn outside the element, where the neighbouring
 * grid cells paint over it. Draw it inside instead, the same way the design system does for
 * truncated resource names.
 */
[role='gridcell']:focus-visible,
[role='gridcell'] button:focus-visible {
  outline: none;
  box-shadow: inset 0 0 0 2px var(--oc-role-secondary);
}
</style>
