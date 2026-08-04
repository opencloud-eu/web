import { useTask } from 'vue-concurrency'
import { useClientService, useConfigStore } from '@opencloud-eu/web-pkg'
import { createAppointmentService } from '../services/appointmentService'
import { useAppointmentsStore } from './piniaStores/appointments'
import type { AppointmentDateRange } from '../types'

let loadAppointmentsTask: ReturnType<typeof useTask> | null = null
let loadCalendarsTask: ReturnType<typeof useTask> | null = null

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
        loader: (accountId, range, calendarId) =>
          appointmentService.loadAppointments(accountId, range, calendarId, signal)
      })
    }).restartable()
  }

  if (!loadCalendarsTask) {
    loadCalendarsTask = useTask(function* (signal, accountId: string) {
      return yield appointmentsStore.loadCalendarsForAccount({
        accountId,
        loader: (accountId) => appointmentService.loadCalendars(accountId, signal)
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

  return {
    loadCalendars,
    loadAppointments,
    loadCalendarsTask,
    loadAppointmentsTask
  }
}
