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
        <span v-for="weekday in weekdays" :key="weekday" v-text="$gettext(weekday)" />
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
          @click="setSelectedDate(day.date)"
          v-text="day.dayOfMonth"
        />
      </div>
    </section>

    <section class="-mt-1">
      <button
        type="button"
        class="mb-4 flex w-full items-center justify-between text-left text-base font-bold"
      >
        <span v-text="$gettext('My Calendar')" />
        <oc-icon name="arrow-down-s" fill-type="line" />
      </button>
      <ul class="ml-0 flex flex-col gap-1">
        <li v-if="isLoadingCalendars" class="flex items-center gap-2 text-sm">
          <oc-spinner :aria-label="$gettext('Loading calendars')" size="small" />
          <span v-text="$gettext('Loading calendars')" />
        </li>
        <li
          v-else-if="calendarError"
          class="text-sm text-role-error"
          v-text="calendarError.message"
        />
        <li v-else-if="!calendars.length" class="text-sm text-role-on-surface-variant">
          <span v-text="$gettext('No calendars found')" />
        </li>
        <template v-else>
          <li v-for="item in calendars" :key="item.id">
            <button
              type="button"
              :class="[
                'flex w-full items-center gap-3 rounded py-1 text-left text-sm leading-5 text-role-on-surface hover:bg-role-surface-container-highest focus-visible:bg-role-surface-container-highest'
              ]"
              :aria-pressed="selectedCalendarIds.includes(item.id)"
              :data-testid="`calendar-navigation-item-${item.id}`"
              @click="toggleSelectedCalendarId(item.id)"
            >
              <span
                :class="[
                  'flex size-4 min-w-4 items-center justify-center rounded border',
                  selectedCalendarIds.includes(item.id)
                    ? 'border-role-primary bg-role-primary text-role-on-primary'
                    : ''
                ]"
                :style="getCalendarColorStyle(item)"
              >
                <oc-icon
                  v-if="selectedCalendarIds.includes(item.id)"
                  name="check"
                  fill-type="line"
                  size="xsmall"
                />
              </span>
              <span class="truncate" v-text="item.name" />
            </button>
          </li>
        </template>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppointmentsStore } from '../composables/piniaStores/appointments'
import { getMonthGridDays, toDateKey } from '../helpers/date'
import type { Calendar } from '../types'

const appointmentsStore = useAppointmentsStore()
const {
  calendars,
  calendarError,
  currentMonth,
  isLoadingCalendars,
  selectedCalendarIds,
  selectedDate
} = storeToRefs(appointmentsStore)
const { goToNextMonth, goToPreviousMonth, setSelectedDate, toggleSelectedCalendarId } =
  appointmentsStore

const weekdays = computed(() => ['M', 'T', 'W', 'T', 'F', 'S', 'S'])
const miniMonthDays = computed(() => getMonthGridDays(unref(currentMonth)))
const selectedDateKey = computed(() => toDateKey(unref(selectedDate)))
const monthLabel = computed(() => {
  return unref(currentMonth).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric'
  })
})

const getCalendarColorStyle = (calendar: Calendar) => {
  if (!calendar.color) {
    return {}
  }

  return {
    borderColor: calendar.color
  }
}
</script>
