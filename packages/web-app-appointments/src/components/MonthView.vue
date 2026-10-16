<template>
  <section
    class="relative flex h-full min-h-0 flex-col overflow-hidden rounded-tl-lg bg-role-surface"
    data-testid="calendar-month-view"
  >
    <header
      class="flex shrink-0 items-center justify-center gap-4 bg-role-surface px-4 py-3 md:grid md:grid-cols-[1fr_auto_1fr]"
    >
      <div class="hidden min-w-0 md:block">
        <h1 class="truncate text-xl font-bold" v-text="$gettext('Appointments')" />
      </div>

      <div class="flex items-center justify-center gap-3">
        <h2
          :id="monthLabelId"
          class="text-center text-xl font-bold md:min-w-52"
          v-text="monthLabel"
        />
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

      <div class="hidden md:block" />
    </header>

    <div
      v-if="error"
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
      class="flex min-h-0 flex-1 flex-col"
      role="grid"
      :aria-labelledby="monthLabelId"
      :aria-busy="isLoading"
      @keydown="onGridKeydown"
    >
      <div class="grid shrink-0 grid-cols-7 border-b border-role-outline-variant" role="row">
        <div
          v-for="weekday in weekdays"
          :key="weekday.key"
          class="border-l border-role-outline-variant px-1 py-4 text-center text-sm text-role-on-surface"
          role="columnheader"
        >
          <span aria-hidden="true" v-text="weekday.label" />
          <span class="sr-only" v-text="weekday.fullLabel" />
        </div>
      </div>

      <div
        v-for="(week, weekIndex) in weeks"
        :key="weekIndex"
        class="grid min-h-0 flex-1 grid-cols-7"
        role="row"
      >
        <div
          v-for="day in week"
          :key="day.key"
          :class="[
            'group flex min-h-0 cursor-pointer flex-col overflow-hidden border-b border-l border-role-outline-variant px-1 py-2 text-left',
            day.isCurrentMonth ? 'bg-role-surface' : 'bg-role-surface-container'
          ]"
          :tabindex="day.key === activeDayKey ? 0 : -1"
          :aria-label="getDayLabel(day)"
          :aria-selected="day.key === selectedDateKey"
          :aria-current="day.isToday ? 'date' : undefined"
          :data-is-today="day.isToday || undefined"
          :data-testid="`calendar-day-cell-${day.key}`"
          role="gridcell"
          @click="selectDay(day)"
        >
          <div class="mb-4 flex shrink-0 items-center justify-center">
            <span
              :class="[
                'flex size-6 items-center justify-center rounded-full text-sm group-hover:bg-role-surface-container-highest',
                getDayNumberClass(day)
              ]"
              aria-hidden="true"
              v-text="day.dayOfMonth"
            />
          </div>

          <MonthDayAppointments
            :day-key="day.key"
            :occurrences="occurrencesByDay[day.key] || []"
            :calendar-color-by-id="calendarColorById"
            @select-appointment="$emit('select-appointment', $event)"
          />
        </div>
      </div>
    </div>

    <div
      v-if="isLoading && !error"
      class="absolute inset-0 flex items-center justify-center bg-role-surface/70"
      data-testid="calendar-loading"
    >
      <app-loading-spinner />
    </div>

    <div
      v-else-if="!error && emptyMessage"
      class="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center"
      data-testid="calendar-empty-message"
    >
      <div
        class="rounded-md border border-role-outline-variant bg-role-surface px-4 py-2 text-sm text-role-on-surface-variant shadow-sm"
        role="status"
        v-text="emptyMessage"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, unref, useId, useTemplateRef, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import { AppLoadingSpinner, NoContentMessage, formatDateFromJSDate } from '@opencloud-eu/web-pkg'
import { DateTime, Info } from 'luxon'
import MonthDayAppointments from './MonthDayAppointments.vue'
import { toDateKey, type CalendarDay } from '../helpers/date'
import type { AppointmentOccurrence } from '../types'

const DAYS_PER_WEEK = 7

const {
  days,
  currentMonth,
  selectedDate,
  occurrencesByDay,
  calendarColorById,
  hasSelectedCalendars = true,
  isLoading,
  error = undefined
} = defineProps<{
  days: CalendarDay[]
  currentMonth: Date
  selectedDate: Date
  occurrencesByDay: Record<string, AppointmentOccurrence[]>
  calendarColorById: Record<string, string | undefined>
  hasSelectedCalendars?: boolean
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

const { $gettext, $ngettext, current: currentLanguage } = useGettext()
const monthLabelId = useId()

const weekdays = computed(() => {
  const fullLabels = Info.weekdays('long', { locale: currentLanguage })

  return Info.weekdays('short', { locale: currentLanguage }).map((label, index) => ({
    key: fullLabels[index],
    label,
    fullLabel: fullLabels[index]
  }))
})

const weeks = computed(() => {
  const result: CalendarDay[][] = []
  for (let index = 0; index < days.length; index += DAYS_PER_WEEK) {
    result.push(days.slice(index, index + DAYS_PER_WEEK))
  }
  return result
})

const selectedDateKey = computed(() => toDateKey(selectedDate))

const emptyMessage = computed(() => {
  if (!hasSelectedCalendars) {
    return $gettext('No calendar selected')
  }

  const hasOccurrencesInMonth = days.some(
    ({ key, isCurrentMonth }) => isCurrentMonth && occurrencesByDay[key]?.length
  )
  return hasOccurrencesInMonth ? '' : $gettext('No appointments in this month')
})

const monthLabel = computed(() => {
  return formatDateFromJSDate(currentMonth, currentLanguage, {
    month: 'long',
    year: 'numeric'
  })
})

function getDayLabel(day: CalendarDay) {
  const date = formatDateFromJSDate(day.date, currentLanguage, DateTime.DATE_FULL)
  const count = occurrencesByDay[day.key]?.length || 0
  if (!count) {
    return date
  }

  return $ngettext('%{date}, %{count} appointment', '%{date}, %{count} appointments', count, {
    date,
    count: count.toString()
  })
}

function getDayNumberClass(day: CalendarDay) {
  if (day.isToday) {
    return 'bg-role-primary-container text-role-on-primary-container'
  }
  if (day.key === unref(selectedDateKey)) {
    return 'bg-role-secondary-container text-role-on-secondary-container'
  }
  return day.isCurrentMonth ? 'text-role-on-surface' : 'text-role-on-surface-variant'
}

/**
 * The month grid is a single tab stop. Which day cell is tabbable moves with the arrow keys
 * (roving tabindex), so reaching the appointments does not require tabbing through every day.
 */
const grid = useTemplateRef<HTMLElement>('grid')
const activeDayKey = ref<string>()
// Set when the month is changed from the keyboard, so the focus stays in the grid.
const dayOfMonthToFocus = ref<number>()

const activeDayIndex = computed(() => days.findIndex(({ key }) => key === unref(activeDayKey)))

watch(
  () => days,
  () => {
    const dayOfMonth = unref(dayOfMonthToFocus)
    dayOfMonthToFocus.value = undefined

    if (dayOfMonth) {
      const monthDays = days.filter(({ isCurrentMonth }) => isCurrentMonth)
      const day = monthDays[Math.min(dayOfMonth, monthDays.length) - 1]
      focusDay(days.indexOf(day))
      return
    }

    activeDayKey.value =
      days.find(({ key, isCurrentMonth }) => isCurrentMonth && key === unref(selectedDateKey))
        ?.key ||
      days.find(({ isToday, isCurrentMonth }) => isToday && isCurrentMonth)?.key ||
      days.find(({ isCurrentMonth }) => isCurrentMonth)?.key
  },
  { immediate: true }
)

function selectDay(day: CalendarDay) {
  activeDayKey.value = day.key
  emit('select-date', day.date)
}

async function focusDay(index: number) {
  const day = days[Math.min(Math.max(index, 0), days.length - 1)]
  if (!day) {
    return
  }

  activeDayKey.value = day.key
  await nextTick()
  unref(grid)?.querySelector<HTMLElement>(`[data-testid="calendar-day-cell-${day.key}"]`)?.focus()
}

function onGridKeydown(event: KeyboardEvent) {
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
      dayOfMonthToFocus.value = days[index].dayOfMonth
      emit('previous')
      break
    case 'PageDown':
      dayOfMonthToFocus.value = days[index].dayOfMonth
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
