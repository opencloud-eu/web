import { defineStore } from 'pinia'
import { computed, ref, unref } from 'vue'
import {
  addMonths,
  createAppointmentOccurrences,
  formatDateForApi,
  getMonthGridDays,
  getMonthGridRange,
  groupAppointmentOccurrencesByDay,
  isAppointmentInRange
} from '../../helpers/date'
import type {
  Appointment,
  AppointmentDateRange,
  AppointmentOccurrence,
  Calendar
} from '../../types'

export type CalendarFetchState = 'idle' | 'loading' | 'success' | 'error'

export const useAppointmentsStore = defineStore('appointments', () => {
  const today = new Date()
  const activeAccountId = ref<string | null>(null)
  const appointments = ref<Appointment[]>([])
  const calendars = ref<Calendar[]>([])
  const isLoading = ref(false)
  const isLoadingCalendars = ref(false)
  const hasLoadedAppointments = ref(false)
  const hasLoadedCalendars = ref(false)
  const error = ref<Error | null>(null)
  const calendarError = ref<Error | null>(null)
  const selectedCalendarIds = ref<string[]>([])
  const hasInitializedCalendarSelection = ref(false)
  const selectedOccurrenceId = ref<string | null>(null)
  const selectedDate = ref<Date>(today)
  const currentMonth = ref<Date>(new Date(today.getFullYear(), today.getMonth(), 1))
  const visibleDateRange = ref<AppointmentDateRange | null>(null)

  const selectedCalendarId = computed(() => unref(selectedCalendarIds)[0] || null)
  const calendarsById = computed<Record<string, Calendar>>(() => {
    return Object.fromEntries(unref(calendars).map((calendar) => [calendar.id, calendar]))
  })
  const calendarColorById = computed<Record<string, string | undefined>>(() => {
    return Object.fromEntries(unref(calendars).map((calendar) => [calendar.id, calendar.color]))
  })
  const monthDays = computed(() => getMonthGridDays(unref(currentMonth)))
  const currentMonthRange = computed<AppointmentDateRange>(() => {
    const range = getMonthGridRange(unref(currentMonth))
    return {
      start: formatDateForApi(range.start),
      end: formatDateForApi(range.end)
    }
  })
  const visibleAppointments = computed(() => {
    const selectedIds = new Set(unref(selectedCalendarIds))
    const range = unref(visibleDateRange)

    if (!selectedIds.size) {
      return []
    }

    return unref(appointments).filter((appointment) => {
      if (!appointment.calendarId || !selectedIds.has(appointment.calendarId)) {
        return false
      }

      return !range || isAppointmentInRange(appointment, range)
    })
  })
  const visibleOccurrences = computed(() =>
    createAppointmentOccurrences(unref(visibleAppointments))
  )
  const occurrencesByDay = computed(() =>
    groupAppointmentOccurrencesByDay(unref(visibleOccurrences))
  )
  const appointmentsByDay = computed<Record<string, Appointment[]>>(() => {
    return Object.fromEntries(
      Object.entries(unref(occurrencesByDay)).map(([dateKey, occurrences]) => [
        dateKey,
        occurrences.map(({ appointment }) => appointment)
      ])
    )
  })
  const selectedOccurrence = computed(() => {
    return unref(visibleOccurrences).find(({ id }) => id === unref(selectedOccurrenceId)) || null
  })
  const appointmentsFetchState = computed<CalendarFetchState>(() => {
    if (unref(isLoading)) {
      return 'loading'
    }
    if (unref(error)) {
      return 'error'
    }
    return unref(hasLoadedAppointments) ? 'success' : 'idle'
  })
  const calendarsFetchState = computed<CalendarFetchState>(() => {
    if (unref(isLoadingCalendars)) {
      return 'loading'
    }
    if (unref(calendarError)) {
      return 'error'
    }
    return unref(hasLoadedCalendars) ? 'success' : 'idle'
  })

  function setActiveAccountId(accountId: string | null) {
    if (unref(activeAccountId) === accountId) {
      return
    }

    activeAccountId.value = accountId
    appointments.value = []
    calendars.value = []
    selectedCalendarIds.value = []
    selectedOccurrenceId.value = null
    hasInitializedCalendarSelection.value = false
    hasLoadedAppointments.value = false
    hasLoadedCalendars.value = false
    error.value = null
    calendarError.value = null
  }

  function setAppointments(data: Appointment[]) {
    appointments.value = data
    hasLoadedAppointments.value = true

    if (
      unref(selectedOccurrenceId) &&
      !createAppointmentOccurrences(data).some(({ id }) => id === unref(selectedOccurrenceId))
    ) {
      selectedOccurrenceId.value = null
    }
  }

  function setCalendars(data: Calendar[]) {
    calendars.value = data
    hasLoadedCalendars.value = true

    const availableSelection = unref(selectedCalendarIds).filter((id) =>
      data.some((calendar) => calendar.id === id)
    )

    if (unref(hasInitializedCalendarSelection)) {
      selectedCalendarIds.value = availableSelection
      return
    }

    selectedCalendarIds.value = data.map(({ id }) => id)
    hasInitializedCalendarSelection.value = true
  }

  function setSelectedCalendarId(id: string | null) {
    selectedCalendarIds.value = id ? [id] : []
    hasInitializedCalendarSelection.value = true
  }

  function setCalendarSelected(id: string, selected: boolean) {
    if (!unref(calendars).some((calendar) => calendar.id === id)) {
      return
    }

    hasInitializedCalendarSelection.value = true
    if (!selected) {
      if (unref(selectedOccurrence)?.calendarId === id) {
        selectedOccurrenceId.value = null
      }
      selectedCalendarIds.value = unref(selectedCalendarIds).filter(
        (calendarId) => calendarId !== id
      )
      return
    }

    if (!unref(selectedCalendarIds).includes(id)) {
      selectedCalendarIds.value = [...unref(selectedCalendarIds), id]
    }
  }

  function toggleSelectedCalendarId(id: string) {
    setCalendarSelected(id, !unref(selectedCalendarIds).includes(id))
  }

  function setSelectedOccurrence(id: string | null) {
    selectedOccurrenceId.value = id
  }

  function setSelectedDate(date: Date) {
    selectedDate.value = date
  }

  function setCurrentMonth(date: Date) {
    currentMonth.value = new Date(date.getFullYear(), date.getMonth(), 1)
    selectedOccurrenceId.value = null
  }

  function goToPreviousMonth() {
    setCurrentMonth(addMonths(unref(currentMonth), -1))
  }

  function goToNextMonth() {
    setCurrentMonth(addMonths(unref(currentMonth), 1))
  }

  function goToToday() {
    const currentDate = new Date()
    setSelectedDate(currentDate)
    setCurrentMonth(currentDate)
  }

  function setVisibleDateRange(range: AppointmentDateRange | null) {
    visibleDateRange.value = range
  }

  function setLoading(value: boolean) {
    isLoading.value = value
  }

  function setLoadingCalendars(value: boolean) {
    isLoadingCalendars.value = value
  }

  function setError(value: Error | null) {
    error.value = value
  }

  function setCalendarError(value: Error | null) {
    calendarError.value = value
  }

  async function loadCalendarsForAccount({
    accountId,
    loader
  }: {
    accountId: string
    loader: (accountId: string) => Promise<Calendar[]>
  }) {
    setActiveAccountId(accountId)
    setLoadingCalendars(true)
    setCalendarError(null)

    try {
      const result = await loader(accountId)
      setCalendars(result)
      return result
    } catch (caughtError) {
      const normalizedError = normalizeError(caughtError)
      setCalendarError(normalizedError)
      throw normalizedError
    } finally {
      setLoadingCalendars(false)
    }
  }

  async function loadAppointmentsForRange({
    accountId,
    calendarId,
    range,
    loader
  }: {
    accountId: string
    calendarId?: string | string[]
    range: AppointmentDateRange
    loader: (
      accountId: string,
      range: AppointmentDateRange,
      calendarId?: string | string[]
    ) => Promise<Appointment[]>
  }) {
    setActiveAccountId(accountId)
    setLoading(true)
    setError(null)
    setVisibleDateRange(range)

    try {
      const result = await loader(accountId, range, calendarId)
      setAppointments(result)
      return result
    } catch (caughtError) {
      const normalizedError = normalizeError(caughtError)
      setError(normalizedError)
      throw normalizedError
    } finally {
      setLoading(false)
    }
  }

  function prepareVisibleRangeForCurrentMonth() {
    const apiRange = unref(currentMonthRange)
    setVisibleDateRange(apiRange)
    return apiRange
  }

  function getAppointmentsForDay(dateKey: string) {
    return unref(appointmentsByDay)[dateKey] || []
  }

  function getOccurrencesForDay(dateKey: string): AppointmentOccurrence[] {
    return unref(occurrencesByDay)[dateKey] || []
  }

  function reset() {
    activeAccountId.value = null
    appointments.value = []
    calendars.value = []
    isLoading.value = false
    isLoadingCalendars.value = false
    hasLoadedAppointments.value = false
    hasLoadedCalendars.value = false
    error.value = null
    calendarError.value = null
    selectedCalendarIds.value = []
    hasInitializedCalendarSelection.value = false
    selectedOccurrenceId.value = null
    const resetDate = new Date()
    selectedDate.value = resetDate
    currentMonth.value = new Date(resetDate.getFullYear(), resetDate.getMonth(), 1)
    visibleDateRange.value = null
  }

  return {
    activeAccountId,
    appointments,
    calendars,
    isLoading,
    isLoadingCalendars,
    error,
    calendarError,
    selectedCalendarIds,
    selectedCalendarId,
    selectedOccurrenceId,
    selectedOccurrence,
    selectedDate,
    currentMonth,
    visibleDateRange,
    calendarsById,
    calendarColorById,
    monthDays,
    currentMonthRange,
    visibleAppointments,
    visibleOccurrences,
    occurrencesByDay,
    appointmentsByDay,
    appointmentsFetchState,
    calendarsFetchState,
    setActiveAccountId,
    setAppointments,
    setCalendars,
    setSelectedCalendarId,
    setCalendarSelected,
    toggleSelectedCalendarId,
    setSelectedOccurrence,
    setSelectedDate,
    setCurrentMonth,
    goToPreviousMonth,
    goToNextMonth,
    goToToday,
    setVisibleDateRange,
    setLoading,
    setLoadingCalendars,
    setError,
    setCalendarError,
    loadCalendarsForAccount,
    loadAppointmentsForRange,
    prepareVisibleRangeForCurrentMonth,
    getAppointmentsForDay,
    getOccurrencesForDay,
    reset
  }
})

export type AppointmentsStore = ReturnType<typeof useAppointmentsStore>

function normalizeError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error))
}
