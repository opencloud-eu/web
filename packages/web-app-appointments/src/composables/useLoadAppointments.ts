import { computed, ref, unref } from 'vue'
import { useTask } from 'vue-concurrency'
import { useCalendarApi } from './useCalendarApi'
import { useAppointmentsStore } from './piniaStores/appointments'
import type { Appointment, AppointmentDateRange, Calendar } from '../types'

/**
 * The tasks own the loading and error state. Because they are `restartable`, a superseded run
 * is cancelled before it can write to the store, so neither its result nor its abort error can
 * override the state of the run that replaced it.
 */
let loadAppointmentsTask: ReturnType<typeof useTask> | null = null
let loadCalendarsTask: ReturnType<typeof useTask> | null = null

const appointmentsError = ref<Error>()
const calendarsError = ref<Error>()

const isLoadingAppointments = computed(() => loadAppointmentsTask?.isRunning ?? false)
const isLoadingCalendars = computed(() => loadCalendarsTask?.isRunning ?? false)
const isLoading = computed(() => unref(isLoadingCalendars) || unref(isLoadingAppointments))
const error = computed(() => unref(calendarsError) || unref(appointmentsError))

export const useLoadAppointments = () => {
  const appointmentsStore = useAppointmentsStore()
  const calendarApi = useCalendarApi()

  if (!loadCalendarsTask) {
    loadCalendarsTask = useTask(function* (signal, accountId: string) {
      calendarsError.value = undefined

      try {
        const calendars = (yield calendarApi.loadCalendars(accountId, signal)) as Calendar[]
        appointmentsStore.setCalendars(calendars)
        return calendars
      } catch (e) {
        console.error('Failed to load calendars:', e)
        calendarsError.value = normalizeError(e)
        throw e
      }
    }).restartable()
  }

  if (!loadAppointmentsTask) {
    loadAppointmentsTask = useTask(function* (
      signal,
      accountId: string,
      range: AppointmentDateRange,
      calendarIds: string[]
    ) {
      appointmentsError.value = undefined

      try {
        const appointments = (yield calendarApi.loadAppointments(
          accountId,
          range,
          calendarIds,
          signal
        )) as Appointment[]
        appointmentsStore.setAppointments(appointments)
        return appointments
      } catch (e) {
        console.error('Failed to load appointments:', e)
        appointmentsError.value = normalizeError(e)
        throw e
      }
    }).restartable()
  }

  const loadCalendars = (accountId: string) => {
    return loadCalendarsTask!.perform(accountId)
  }

  const loadAppointments = (
    accountId: string,
    range: AppointmentDateRange,
    calendarIds: string[]
  ) => {
    return loadAppointmentsTask!.perform(accountId, range, calendarIds)
  }

  const clearAppointments = () => {
    loadAppointmentsTask!.cancelAll()
    appointmentsError.value = undefined
    appointmentsStore.setAppointments([])
  }

  return {
    loadCalendars,
    loadAppointments,
    clearAppointments,
    isLoading,
    isLoadingCalendars,
    calendarsError,
    error
  }
}

const normalizeError = (error: unknown) => {
  return error instanceof Error ? error : new Error(String(error))
}
