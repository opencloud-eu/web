import { useGettext } from 'vue3-gettext'
import { formatOccurrenceDateTime } from '../helpers/date'
import type { AppointmentOccurrence, AppointmentParticipant } from '../types'

export function useAppointmentPresentation() {
  const { $gettext, current: currentLanguage } = useGettext()

  function formatWhen(occurrence: AppointmentOccurrence) {
    return formatOccurrenceDateTime(occurrence, currentLanguage)
  }

  function formatParticipant(participant: AppointmentParticipant) {
    const identity = participant.name || participant.email || $gettext('Unknown participant')
    const status = formatParticipantStatus(participant.status)
    return status ? `${identity} (${status})` : identity
  }

  function formatParticipantStatus(status?: string) {
    switch (status) {
      case 'accepted':
        return $gettext('Accepted')
      case 'declined':
        return $gettext('Declined')
      case 'tentative':
        return $gettext('Tentative')
      case 'needs-action':
        return $gettext('Needs action')
      default:
        return status || ''
    }
  }

  function formatPrivacy(privacy?: string) {
    switch (privacy) {
      case 'public':
        return $gettext('Public')
      case 'private':
        return $gettext('Private')
      case 'secret':
        return $gettext('Secret')
      case 'confidential':
        return $gettext('Confidential')
      default:
        return privacy || ''
    }
  }

  function formatStatus(status?: string) {
    switch (status) {
      case 'confirmed':
        return $gettext('Confirmed')
      case 'cancelled':
        return $gettext('Cancelled')
      case 'tentative':
        return $gettext('Tentative')
      default:
        return status || ''
    }
  }

  return {
    formatParticipant,
    formatPrivacy,
    formatStatus,
    formatWhen
  }
}
