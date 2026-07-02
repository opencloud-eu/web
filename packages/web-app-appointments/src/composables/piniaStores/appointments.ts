import { defineStore } from 'pinia'
import { computed, ref, unref } from 'vue'
import type {
  Appointment,
  AppointmentDateRange,
  Calendar,
  CalendarViewMode,
  CreateAppointmentPayload
} from '../../types'
import { addMonths, getMonthGridRange, groupAppointmentsByDay } from '../../helpers/date'

export const useAppointmentsStore = defineStore('appointments', () => {
  const appointments = ref<Appointment[]>([])
  const calendars = ref<Calendar[]>([])
  const isLoading = ref(false)
  const isLoadingCalendars = ref(false)
  const error = ref<Error | null>(null)
  const calendarError = ref<Error | null>(null)
  const selectedCalendarIds = ref<string[]>([])
  const selectedCalendarId = computed(() => unref(selectedCalendarIds)[0] || null)
  const selectedDate = ref<Date>(new Date())
  const currentMonth = ref<Date>(new Date())
  const visibleDateRange = ref<AppointmentDateRange | null>(null)
  const viewMode = ref<CalendarViewMode>('month')
  const isCreateModalOpen = ref(false)

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

  const upsertAppointment = (data: Appointment) => {
    const existing = unref(appointments).find(({ id }) => id === data.id)
    if (existing) {
      Object.assign(existing, data)
      return
    }

    unref(appointments).push(data)
  }

  const setSelectedDate = (date: Date) => {
    selectedDate.value = date
  }

  const setCurrentMonth = (date: Date) => {
    currentMonth.value = new Date(date.getFullYear(), date.getMonth(), 1)
  }

  const setViewMode = (mode: CalendarViewMode) => {
    viewMode.value = mode
  }

  const openCreateModal = () => {
    isCreateModalOpen.value = true
  }

  const closeCreateModal = () => {
    isCreateModalOpen.value = false
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

  const createAppointment = async ({
    accountId,
    payload,
    creator
  }: {
    accountId: string
    payload: CreateAppointmentPayload
    creator: (accountId: string, payload: CreateAppointmentPayload) => Promise<Appointment | null>
  }) => {
    setLoading(true)
    setError(null)

    try {
      const appointment = await creator(accountId, payload)
      if (appointment) {
        upsertAppointment(appointment)
      }
      closeCreateModal()
      return appointment
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
      start: range.start.toISOString(),
      end: range.end.toISOString()
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
    selectedDate.value = new Date()
    currentMonth.value = new Date()
    visibleDateRange.value = null
    viewMode.value = 'month'
    isCreateModalOpen.value = false
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
    viewMode,
    isCreateModalOpen,
    appointmentsByDay,
    setAppointments,
    setCalendars,
    setSelectedCalendarId,
    toggleSelectedCalendarId,
    upsertAppointment,
    setSelectedDate,
    setCurrentMonth,
    setViewMode,
    openCreateModal,
    closeCreateModal,
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
    createAppointment,
    prepareVisibleRangeForCurrentMonth,
    reset
  }
})

export type AppointmentsStore = ReturnType<typeof useAppointmentsStore>
