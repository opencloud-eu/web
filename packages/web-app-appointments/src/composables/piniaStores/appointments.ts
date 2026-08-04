import { defineStore } from 'pinia'
import { computed, ref, unref } from 'vue'
import type { Appointment, AppointmentDateRange, Calendar } from '../../types'
import {
  addMonths,
  formatDateForApi,
  getMonthGridRange,
  groupAppointmentsByDay
} from '../../helpers/date'

export const useAppointmentsStore = defineStore('appointments', () => {
  const today = new Date()
  const appointments = ref<Appointment[]>([])
  const calendars = ref<Calendar[]>([])
  const isLoading = ref(false)
  const isLoadingCalendars = ref(false)
  const error = ref<Error | null>(null)
  const calendarError = ref<Error | null>(null)
  const selectedCalendarIds = ref<string[]>([])
  const selectedCalendarId = computed(() => unref(selectedCalendarIds)[0] || null)
  const selectedDate = ref<Date>(today)
  const currentMonth = ref<Date>(new Date(today.getFullYear(), today.getMonth(), 1))
  const visibleDateRange = ref<AppointmentDateRange | null>(null)

  const appointmentsByDay = computed(() => groupAppointmentsByDay(unref(appointments)))

  const setAppointments = (data: Appointment[]) => {
    appointments.value = data
  }

  const setCalendars = (data: Calendar[]) => {
    calendars.value = data

    if (!data.length) {
      selectedCalendarIds.value = []
      return
    }

    const availableSelection = unref(selectedCalendarIds).filter((id) =>
      data.some((calendar) => calendar.id === id)
    )

    if (availableSelection.length) {
      selectedCalendarIds.value = availableSelection
      return
    }

    selectedCalendarIds.value = [data.find(({ isDefault }) => isDefault)?.id || data[0].id]
  }

  const setSelectedCalendarId = (id: string | null) => {
    selectedCalendarIds.value = id ? [id] : []
  }

  const toggleSelectedCalendarId = (id: string) => {
    if (unref(selectedCalendarIds).includes(id)) {
      selectedCalendarIds.value = unref(selectedCalendarIds).filter(
        (calendarId) => calendarId !== id
      )
      return
    }

    selectedCalendarIds.value = [...unref(selectedCalendarIds), id]
  }

  const setSelectedDate = (date: Date) => {
    selectedDate.value = date
  }

  const setCurrentMonth = (date: Date) => {
    currentMonth.value = new Date(date.getFullYear(), date.getMonth(), 1)
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

  const setVisibleDateRange = (range: AppointmentDateRange | null) => {
    visibleDateRange.value = range
  }

  const setLoading = (value: boolean) => {
    isLoading.value = value
  }

  const setLoadingCalendars = (value: boolean) => {
    isLoadingCalendars.value = value
  }

  const setError = (value: Error | null) => {
    error.value = value
  }

  const setCalendarError = (value: Error | null) => {
    calendarError.value = value
  }

  const loadCalendarsForAccount = async ({
    accountId,
    loader
  }: {
    accountId: string
    loader: (accountId: string) => Promise<Calendar[]>
  }) => {
    setLoadingCalendars(true)
    setCalendarError(null)

    try {
      const result = await loader(accountId)
      setCalendars(result)
      return result
    } catch (e) {
      const normalizedError = e instanceof Error ? e : new Error(String(e))
      setCalendarError(normalizedError)
      throw normalizedError
    } finally {
      setLoadingCalendars(false)
    }
  }

  const loadAppointmentsForRange = async ({
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
  }) => {
    setLoading(true)
    setError(null)
    setVisibleDateRange(range)

    try {
      const result = await loader(accountId, range, calendarId)
      setAppointments(result)
      return result
    } catch (e) {
      const normalizedError = e instanceof Error ? e : new Error(String(e))
      setError(normalizedError)
      throw normalizedError
    } finally {
      setLoading(false)
    }
  }

  const prepareVisibleRangeForCurrentMonth = () => {
    const range = getMonthGridRange(unref(currentMonth))
    const apiRange = {
      start: formatDateForApi(range.start),
      end: formatDateForApi(range.end)
    }
    setVisibleDateRange(apiRange)
    return apiRange
  }

  const reset = () => {
    appointments.value = []
    calendars.value = []
    isLoading.value = false
    isLoadingCalendars.value = false
    error.value = null
    calendarError.value = null
    selectedCalendarIds.value = []
    const resetDate = new Date()
    selectedDate.value = resetDate
    currentMonth.value = new Date(resetDate.getFullYear(), resetDate.getMonth(), 1)
    visibleDateRange.value = null
  }

  return {
    appointments,
    calendars,
    isLoading,
    isLoadingCalendars,
    error,
    calendarError,
    selectedCalendarIds,
    selectedCalendarId,
    selectedDate,
    currentMonth,
    visibleDateRange,
    appointmentsByDay,
    setAppointments,
    setCalendars,
    setSelectedCalendarId,
    toggleSelectedCalendarId,
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
    reset
  }
})

export type AppointmentsStore = ReturnType<typeof useAppointmentsStore>
