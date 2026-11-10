import { useGettext } from 'vue3-gettext'
import { DateTime } from 'luxon'
import { formatRelativeDateFromJSDate } from '@opencloud-eu/web-pkg'
import { GuestLinkErrorErrorTypeEnum } from '@opencloud-eu/web-client/graph/generated'
import { GuestLinkErrorType } from '../../services/auth/guestSessionManager'

export function useGuestLinkErrorMessages() {
  const { $gettext, current: currentLanguage } = useGettext()

  function getShareErrorMessage(errorType: GuestLinkErrorType): string | undefined {
    switch (errorType) {
      case GuestLinkErrorErrorTypeEnum.ShareExpired:
        return $gettext('Your access to the shared item has expired.')
      case GuestLinkErrorErrorTypeEnum.ShareNotFound:
      // the backend deletes the link of a removed or expired share
      case GuestLinkErrorErrorTypeEnum.TokenNotFound:
        return $gettext('The shared item is no longer available.')
      default:
        return undefined
    }
  }

  function getPinErrorMessage(errorType: GuestLinkErrorType): string | undefined {
    switch (errorType) {
      case undefined:
        return undefined
      case GuestLinkErrorErrorTypeEnum.PinInvalid:
        return $gettext('The PIN is incorrect.')
      case GuestLinkErrorErrorTypeEnum.PinExpired:
      case GuestLinkErrorErrorTypeEnum.NonceExpired:
      // the browser drops the nonce cookie once it expired
      case GuestLinkErrorErrorTypeEnum.InvalidRequest:
        return $gettext(
          'The PIN has expired. Open the invitation link from your most recent email to get a new one.'
        )
      case GuestLinkErrorErrorTypeEnum.NonceInvalid:
        return $gettext(
          'The PIN only works in the browser it was requested in. Open the invitation link from your most recent email instead.'
        )
      case GuestLinkErrorErrorTypeEnum.TooManyRequests:
        return $gettext('Too many attempts. Please try again later.')
      default:
        return (
          getShareErrorMessage(errorType) ||
          $gettext('The PIN could not be verified. Please try again later.')
        )
    }
  }

  function formatRetryTime(retryAt: Date, now = new Date()): string {
    // round up, an early retry would be rejected again. whole seconds, because luxon
    // shows less than one second as "in 0 seconds" even when rounding up
    const seconds = Math.ceil((retryAt.getTime() - now.getTime()) / 1000)
    return formatRelativeDateFromJSDate(retryAt, currentLanguage, {
      rounding: 'ceil',
      base: DateTime.fromJSDate(retryAt).minus({ seconds })
    })
  }

  function getRateLimitMessage(retryAt: Date | undefined, now?: Date): string {
    if (!retryAt) {
      return $gettext('Too many new invitations were requested. Please try again later.')
    }
    return $gettext('Too many new invitations were requested. Please try again %{time}.', {
      time: formatRetryTime(retryAt, now)
    })
  }

  function getPinRateLimitMessage(retryAt: Date | undefined): string {
    if (!retryAt) {
      return $gettext('Too many PINs were requested. Please try again later.')
    }
    return $gettext('Too many PINs were requested. Please try again %{time}.', {
      time: formatRetryTime(retryAt)
    })
  }

  return { getShareErrorMessage, getPinErrorMessage, getRateLimitMessage, getPinRateLimitMessage }
}
