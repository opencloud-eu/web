import { useTask } from 'vue-concurrency'
import { useCalendarApi } from './useCalendarApi'
import { useAppointmentsStore } from './piniaStores/appointments'
import type { AppointmentDateRange } from '../types'

let loadAppointmentsTask: ReturnType<typeof useTask> | null = null
let loadCalendarsTask: ReturnType<typeof useTask> | null = null

export function useLoadAppointments() {
  const appointmentsStore = useAppointmentsStore()
  const calendarApi = useCalendarApi()

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
          calendarApi.loadAppointments(accountId, range, calendarId, signal)
      })
    }).restartable()
  }

  if (!loadCalendarsTask) {
    loadCalendarsTask = useTask(function* (signal, accountId: string) {
      return yield appointmentsStore.loadCalendarsForAccount({
        accountId,
        loader: (accountId) => calendarApi.loadCalendars(accountId, signal)
      })
    }).restartable()
  }

  function loadAppointments(
    accountId: string,
    range: AppointmentDateRange,
    calendarId?: string | string[]
  ) {
    return loadAppointmentsTask!.perform(accountId, range, calendarId)
  }

  function loadCalendars(accountId: string) {
    return loadCalendarsTask!.perform(accountId)
  }

  return {
    loadCalendars,
    loadAppointments,
    loadCalendarsTask,
    loadAppointmentsTask
  }
}
