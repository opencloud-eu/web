<template>
  <div class="flex h-full flex-col gap-8 bg-role-surface-container px-6 py-4">
    <section class="calendar-mini-month">
      <div class="mb-4 flex items-center justify-between gap-2">
        <h2 class="text-base font-bold" v-text="monthLabel" />
        <div class="flex items-center gap-1">
          <oc-button
            appearance="raw"
            :aria-label="$gettext('Previous month')"
            @click="goToPreviousMonth"
          >
            <oc-icon name="arrow-left-s" fill-type="line" />
          </oc-button>
          <oc-button appearance="raw" :aria-label="$gettext('Next month')" @click="goToNextMonth">
            <oc-icon name="arrow-right-s" fill-type="line" />
          </oc-button>
        </div>
      </div>

      <div class="mb-2 grid grid-cols-7 text-center text-xs text-role-on-surface-variant">
        <span
          v-for="weekday in weekdays"
          :key="weekday.key"
          :aria-label="weekday.fullLabel"
          v-text="weekday.shortLabel"
        />
      </div>
      <div class="grid grid-cols-7 gap-y-3 text-center text-sm">
        <button
          v-for="day in miniMonthDays"
          :key="day.key"
          type="button"
          :class="[
            'mx-auto flex size-6 items-center justify-center rounded-full',
            day.isCurrentMonth ? 'text-role-on-surface' : 'text-role-on-surface-variant',
            day.isToday || day.key === selectedDateKey
              ? 'bg-role-secondary-container text-role-on-secondary-container'
              : ''
          ]"
          :aria-label="formatDayLabel(day.date)"
          @click="selectDate(day.date)"
          v-text="day.dayOfMonth"
        />
      </div>
    </section>

    <section class="-mt-1">
      <h2 class="mb-4 text-base font-bold" v-text="$gettext('Calendars')" />
      <ul class="ml-0 flex flex-col gap-1">
        <li v-if="isLoadingCalendars" class="flex items-center gap-2 text-sm">
          <oc-spinner :aria-label="$gettext('Loading calendars')" size="small" />
          <span v-text="$gettext('Loading calendars')" />
        </li>
        <li
          v-else-if="calendarError"
          class="text-sm text-role-error"
          v-text="$gettext('Calendars could not be loaded')"
        />
        <li v-else-if="!calendars.length" class="text-sm text-role-on-surface-variant">
          <span v-text="$gettext('No calendars found')" />
        </li>
        <template v-else>
          <li v-for="item in calendars" :key="item.id">
            <div
              class="flex w-full items-center gap-2 rounded px-1 py-1 text-sm leading-5 text-role-on-surface hover:bg-role-surface-container-highest focus-within:bg-role-surface-container-highest"
              :data-testid="`calendar-navigation-item-${item.id}`"
            >
              <span
                class="size-3 shrink-0 rounded-full"
                :style="{ backgroundColor: resolveCalendarColor(item.color) }"
                aria-hidden="true"
              />
              <oc-checkbox
                :model-value="selectedCalendarIds.includes(item.id)"
                :label="item.name"
                class="min-w-0 flex-1"
                @update:model-value="setCalendarSelected(item.id, $event)"
              />
            </div>
          </li>
        </template>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGettext } from 'vue3-gettext'
import { DateTime } from 'luxon'
import { formatDateFromJSDate } from '@opencloud-eu/web-pkg'
import { useAppointmentsStore } from '../composables/piniaStores/appointments'
import { getMonthGridDays, toDateKey } from '../helpers/date'
import { resolveCalendarColor } from '../helpers/color'

const appointmentsStore = useAppointmentsStore()
const {
  calendars,
  calendarError,
  currentMonth,
  isLoadingCalendars,
  selectedCalendarIds,
  selectedDate
} = storeToRefs(appointmentsStore)
const { goToNextMonth, goToPreviousMonth, setCalendarSelected, setCurrentMonth, setSelectedDate } =
  appointmentsStore

const { $gettext, current: currentLanguage } = useGettext()
const weekdays = computed(() => [
  { key: 'monday', shortLabel: $gettext('M'), fullLabel: $gettext('Monday') },
  { key: 'tuesday', shortLabel: $gettext('T'), fullLabel: $gettext('Tuesday') },
  { key: 'wednesday', shortLabel: $gettext('W'), fullLabel: $gettext('Wednesday') },
  { key: 'thursday', shortLabel: $gettext('T'), fullLabel: $gettext('Thursday') },
  { key: 'friday', shortLabel: $gettext('F'), fullLabel: $gettext('Friday') },
  { key: 'saturday', shortLabel: $gettext('S'), fullLabel: $gettext('Saturday') },
  { key: 'sunday', shortLabel: $gettext('S'), fullLabel: $gettext('Sunday') }
])
const miniMonthDays = computed(() => getMonthGridDays(unref(currentMonth)))
const selectedDateKey = computed(() => toDateKey(unref(selectedDate)))
const monthLabel = computed(() => {
  return formatDateFromJSDate(unref(currentMonth), currentLanguage, {
    month: 'long',
    year: 'numeric'
  })
})

function selectDate(date: Date) {
  setSelectedDate(date)
  setCurrentMonth(date)
}

function formatDayLabel(date: Date) {
  return formatDateFromJSDate(date, currentLanguage, DateTime.DATE_FULL)
}
</script>
