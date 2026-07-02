import { computed } from 'vue'
import { useTask } from 'vue-concurrency'
import { useClientService, useConfigStore } from '@opencloud-eu/web-pkg'
import { createAppointmentService } from '../services/appointmentService'
import { useAppointmentsStore } from './piniaStores/appointments'
import type { AppointmentDateRange, CreateAppointmentPayload } from '../types'

let loadAppointmentsTask: ReturnType<typeof useTask> | null = null
let loadCalendarsTask: ReturnType<typeof useTask> | null = null
let createAppointmentTask: ReturnType<typeof useTask> | null = null
const isLoading = computed(() => loadAppointmentsTask?.isRunning ?? false)
const isLoadingCalendars = computed(() => loadCalendarsTask?.isRunning ?? false)

export const useLoadAppointments = () => {
  const configStore = useConfigStore()
  const clientService = useClientService()
  const appointmentsStore = useAppointmentsStore()
  const appointmentService = createAppointmentService({
    client: clientService.httpAuthenticated,
    groupwareUrl: configStore.groupwareUrl
  })

  if (!loadAppointmentsTask) {
    loadAppointmentsTask = useTask(function* (
      signal,
      accountId: string,
      range: AppointmentDateRange,
      calendarId?: string | string[]
    ) {
      return yield appointmentsStore.loadAppointmentsForRange({
        accountId,
        calendarId,
        range,
        loader: appointmentService.loadAppointments
      })
    }).restartable()
  }

  if (!loadCalendarsTask) {
    loadCalendarsTask = useTask(function* (signal, accountId: string) {
      return yield appointmentsStore.loadCalendarsForAccount({
        accountId,
        loader: appointmentService.loadCalendars
      })
    }).restartable()
  }

  if (!createAppointmentTask) {
    createAppointmentTask = useTask(function* (
      signal,
      accountId: string,
      payload: CreateAppointmentPayload
    ) {
      return yield appointmentsStore.createAppointment({
        accountId,
        payload,
        creator: appointmentService.createAppointment
      })
    }).restartable()
  }

  const loadAppointments = (
    accountId: string,
    range: AppointmentDateRange,
    calendarId?: string | string[]
  ) => {
    return loadAppointmentsTask!.perform(accountId, range, calendarId)
  }

  const loadCalendars = (accountId: string) => {
    return loadCalendarsTask!.perform(accountId)
  }

  const createAppointment = (accountId: string, payload: CreateAppointmentPayload) => {
    return createAppointmentTask!.perform(accountId, payload)
  }

  return {
    loadCalendars,
    loadAppointments,
    createAppointment,
    createAppointmentTask,
    loadCalendarsTask,
    loadAppointmentsTask,
    isLoading,
    isLoadingCalendars
  }
}
