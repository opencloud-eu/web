import { defineStore } from 'pinia'
import { computed, ref, unref } from 'vue'
import {
  addMonths,
  createAppointmentOccurrences,
  getMonthGridDateRange,
  getMonthGridDays,
  getStartOfMonth,
  groupAppointmentOccurrencesByDay,
  isAppointmentInRange
} from '../../helpers/date'
import type { Appointment, AppointmentDateRange, Calendar } from '../../types'

export const useAppointmentsStore = defineStore('appointments', () => {
  const activeAccountId = ref<string>()
  const appointments = ref<Appointment[]>([])
  const calendars = ref<Calendar[]>([])
  const selectedCalendarIds = ref<string[]>([])
  const hasInitializedCalendarSelection = ref(false)
  const selectedOccurrenceId = ref<string>()
  const selectedDate = ref<Date>(new Date())
  const currentMonth = ref<Date>(getStartOfMonth(new Date()))

  const calendarsById = computed<Record<string, Calendar>>(() => {
    return Object.fromEntries(unref(calendars).map((calendar) => [calendar.id, calendar]))
  })

  const calendarColorById = computed<Record<string, string | undefined>>(() => {
    return Object.fromEntries(unref(calendars).map((calendar) => [calendar.id, calendar.color]))
  })

  const calendarIds = computed(() => unref(calendars).map(({ id }) => id))

  const monthDays = computed(() => getMonthGridDays(unref(currentMonth)))

  const currentMonthRange = computed<AppointmentDateRange>(() =>
    getMonthGridDateRange(unref(currentMonth))
  )

  const visibleAppointments = computed(() => {
    const selectedIds = new Set(unref(selectedCalendarIds))
    if (!selectedIds.size) {
      return []
    }

    const range = unref(currentMonthRange)

    return unref(appointments).filter((appointment) => {
      if (!appointment.calendarId || !selectedIds.has(appointment.calendarId)) {
        return false
      }

      return isAppointmentInRange(appointment, range)
    })
  })

  const visibleOccurrences = computed(() =>
    createAppointmentOccurrences(unref(visibleAppointments))
  )

  const occurrencesByDay = computed(() =>
    groupAppointmentOccurrencesByDay(unref(visibleOccurrences))
  )

  const selectedOccurrence = computed(() => {
    return unref(visibleOccurrences).find(({ id }) => id === unref(selectedOccurrenceId))
  })

  const setActiveAccountId = (accountId?: string) => {
    if (unref(activeAccountId) === accountId) {
      return
    }

    activeAccountId.value = accountId
    appointments.value = []
    calendars.value = []
    selectedCalendarIds.value = []
    selectedOccurrenceId.value = undefined
    hasInitializedCalendarSelection.value = false
  }

  const setAppointments = (data: Appointment[]) => {
    appointments.value = data
  }

  const setCalendars = (data: Calendar[]) => {
    calendars.value = data

    if (!unref(hasInitializedCalendarSelection)) {
      selectedCalendarIds.value = data.map(({ id }) => id)
      hasInitializedCalendarSelection.value = true
      return
    }

    selectedCalendarIds.value = unref(selectedCalendarIds).filter((id) =>
      data.some((calendar) => calendar.id === id)
    )
  }

  const setCalendarSelected = (id: string, selected: boolean) => {
    if (!unref(calendars).some((calendar) => calendar.id === id)) {
      return
    }

    if (selected) {
      if (!unref(selectedCalendarIds).includes(id)) {
        selectedCalendarIds.value = [...unref(selectedCalendarIds), id]
      }
      return
    }

    selectedCalendarIds.value = unref(selectedCalendarIds).filter((calendarId) => calendarId !== id)
  }

  const setSelectedOccurrence = (id?: string) => {
    selectedOccurrenceId.value = id
  }

  const setSelectedDate = (date: Date) => {
    selectedDate.value = date
  }

  const setCurrentMonth = (date: Date) => {
    currentMonth.value = getStartOfMonth(date)
    selectedOccurrenceId.value = undefined
  }

  const goToPreviousMonth = () => {
    setCurrentMonth(addMonths(unref(currentMonth), -1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(unref(currentMonth), 1))
  }

  const goToToday = () => {
    const today = new Date()
    setSelectedDate(today)
    setCurrentMonth(today)
  }

  return {
    activeAccountId,
    appointments,
    calendars,
    calendarIds,
    selectedCalendarIds,
    selectedOccurrence,
    selectedDate,
    currentMonth,
    calendarsById,
    calendarColorById,
    monthDays,
    currentMonthRange,
    visibleAppointments,
    visibleOccurrences,
    occurrencesByDay,
    setActiveAccountId,
    setAppointments,
    setCalendars,
    setCalendarSelected,
    setSelectedOccurrence,
    setSelectedDate,
    setCurrentMonth,
    goToPreviousMonth,
    goToNextMonth,
    goToToday
  }
})

export type AppointmentsStore = ReturnType<typeof useAppointmentsStore>
