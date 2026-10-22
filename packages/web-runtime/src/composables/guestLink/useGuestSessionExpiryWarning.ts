import { markRaw, onScopeDispose, ref, unref, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import { DateTime } from 'luxon'
import {
  Action,
  formatDateFromISO,
  Message,
  Modal,
  useAuthStore,
  useMessages,
  useModals,
  useRouter
} from '@opencloud-eu/web-pkg'
import { GuestLinkErrorErrorTypeEnum } from '@opencloud-eu/web-client/graph/generated'
import { authService } from '../../services/auth'
import {
  getGuestLinkErrorType,
  getGuestLinkRetryAt,
  GuestLinkRenewal,
  isRetryableGuestLinkErrorType,
  renewalStorageKey
} from '../../services/auth/guestSessionManager'
import GuestSessionPinModal from '../../components/GuestSessionPinModal.vue'
import { isGuestContextRequired } from '../../router/helpers'
import { useGuestLinkErrorMessages } from './useGuestLinkErrorMessages'

// leaves the guest some time to save unsaved changes
const guestSessionExpiryWarningThreshold = 15 * 60 * 1000
// timers pause while the device sleeps, so the wall clock is checked periodically
const expiryCheckInterval = 30 * 1000

/**
 * Warns the guest before the session expires and offers to request a PIN to refresh it.
 */
export function useGuestSessionExpiryWarning() {
  const router = useRouter()
  const authStore = useAuthStore()
  const messageStore = useMessages()
  const modalStore = useModals()
  const language = useGettext()
  const { $gettext } = language
  const { getShareErrorMessage, getPinRateLimitMessage } = useGuestLinkErrorMessages()

  let expiryCheck: ReturnType<typeof setInterval>
  let syncPendingPin: () => void
  let warningMessage: Message
  let pinModal: Modal
  // invalidates a pending warning once the session changed
  let sessionVersion = 0

  function dismissWarning() {
    sessionVersion++
    clearInterval(expiryCheck)
    syncPendingPin = undefined
    if (warningMessage) {
      messageStore.removeMessage(warningMessage)
      warningMessage = undefined
    }
    if (pinModal) {
      modalStore.removeModal(pinModal.id)
      pinModal = undefined
    }
  }

  function openPinModal(permissionId: string) {
    pinModal = modalStore.dispatchModal({
      title: $gettext('Enter PIN'),
      confirmText: $gettext('Continue'),
      focusTrapInitial: '#guest-session-pin-input',
      customComponent: markRaw(GuestSessionPinModal),
      customComponentAttrs: () => ({ permissionId })
    })
  }

  function showWarning(data: Partial<Omit<Message, 'id'>>) {
    if (warningMessage) {
      messageStore.removeMessage(warningMessage)
    }
    warningMessage = messageStore.showMessage({
      title: $gettext('Your session expires soon'),
      status: 'warning',
      timeout: 0,
      ...data
    })
  }

  function scheduleWarning(permissionId: string, expirationDateTime: string) {
    const expiresAt = new Date(expirationDateTime).getTime()
    if (Number.isNaN(expiresAt)) {
      return
    }
    const version = sessionVersion
    const time = formatDateFromISO(expirationDateTime, language.current, DateTime.TIME_SIMPLE)
    const isRequestingPin = ref(false)
    const pinRetryAt = ref(0)
    // refreshed by the expiry check, so the rate limit ends without further interaction
    const currentTime = ref(Date.now())

    function isRequestPinDisabled() {
      return unref(isRequestingPin) || unref(pinRetryAt) > unref(currentTime)
    }

    const requestPinAction: Action = {
      name: 'request-guest-session-pin',
      icon: 'mail-send',
      label: () => $gettext('Request PIN'),
      isVisible: () => true,
      isDisabled: isRequestPinDisabled,
      handler: requestPin
    }
    const enterPinAction: Action = {
      name: 'enter-guest-session-pin',
      icon: 'key-2',
      label: () => $gettext('Enter PIN'),
      isVisible: () => true,
      handler: () => openPinModal(permissionId)
    }
    const requestInvitationAction: Action = {
      name: 'request-guest-invitation',
      icon: 'mail-send',
      label: () => $gettext('Request new invitation'),
      isVisible: () => true,
      handler: requestInvitation
    }

    function isExpired() {
      return Date.now() >= expiresAt
    }

    // the PIN still refreshes the session after it expired
    function hasPendingPin() {
      return !!authService.getPendingGuestLinkRenewal(permissionId)?.withPin
    }

    function showExpiryWarning() {
      if (hasPendingPin()) {
        showWarning({
          desc: $gettext(
            'Your session expires at %{time}. We sent you a PIN by email, enter it to stay signed in.',
            { time }
          ),
          actions: [enterPinAction]
        })
        return
      }
      showWarning({
        desc: $gettext(
          'Your session expires at %{time}. Save your changes, or request a PIN by email to stay signed in.',
          { time }
        ),
        actions: [requestPinAction]
      })
    }

    function showExpired() {
      if (hasPendingPin()) {
        showWarning({
          title: $gettext('Your session has expired'),
          desc: $gettext('Enter the PIN we sent you by email to continue.'),
          actions: [enterPinAction]
        })
        return
      }
      showWarning({
        title: $gettext('Your session has expired'),
        desc: $gettext('Request a new invitation by email to continue.'),
        actions: [requestInvitationAction]
      })
    }

    // without a session the backend only sends a new link if the newest one is used or expired
    function showRenewalRequested() {
      showWarning({
        title: $gettext('Your session has expired'),
        desc: $gettext(
          'Open the invitation link from your most recent email to continue. If it has expired or has already been used, a new one is on its way.'
        ),
        actions: []
      })
    }

    function showRequestError(error: unknown) {
      const errorType = getGuestLinkErrorType(error)
      if (errorType === GuestLinkErrorErrorTypeEnum.TooManyRequests) {
        const retryAt = getGuestLinkRetryAt(error)
        pinRetryAt.value = retryAt?.getTime() ?? 0
        currentTime.value = Date.now()
        showWarning({
          desc: getPinRateLimitMessage(retryAt),
          actions: [requestPinAction]
        })
        return
      }
      if (isRetryableGuestLinkErrorType(errorType)) {
        showWarning({
          desc: $gettext('A PIN could not be requested. Please try again later.'),
          actions: [requestPinAction]
        })
        return
      }
      showWarning({
        desc:
          getShareErrorMessage(errorType) ||
          $gettext(
            'A PIN could not be requested. Save your changes before your session expires at %{time}.',
            { time }
          ),
        actions: []
      })
    }

    // only a request before the session expired sends a PIN
    async function requestPin() {
      if (isRequestPinDisabled()) {
        return
      }
      isRequestingPin.value = true
      let renewal: GuestLinkRenewal
      try {
        renewal = await authService.ensureGuestLinkRenewal(permissionId)
      } catch (error) {
        console.error('guest link could not be renewed:', getGuestLinkErrorType(error))
        if (version !== sessionVersion) {
          return
        }
        // a retry can't send a PIN anymore
        if (isExpired()) {
          showExpired()
          return
        }
        showRequestError(error)
        return
      } finally {
        isRequestingPin.value = false
      }
      if (version !== sessionVersion) {
        return
      }
      if (!renewal.withPin) {
        showRenewalRequested()
        return
      }
      if (isExpired()) {
        showExpired()
        return
      }
      showExpiryWarning()
    }

    // the renew page requests the invitation and handles its outcome
    async function requestInvitation() {
      const route = unref(router.currentRoute)
      const failure = await router.replace({
        name: 'renewGuestLink',
        params: { permissionId },
        ...(isGuestContextRequired(router, route) && { query: { redirectUrl: route.fullPath } })
      })
      // e.g. the guest stayed to keep unsaved changes
      if (failure || version !== sessionVersion) {
        return
      }
      dismissWarning()
    }

    function checkExpiry() {
      currentTime.value = Date.now()
      if (isExpired()) {
        clearInterval(expiryCheck)
        showExpired()
        return
      }
      if (!warningMessage && Date.now() >= expiresAt - guestSessionExpiryWarningThreshold) {
        showExpiryWarning()
      }
    }

    syncPendingPin = () => {
      if (
        !warningMessage ||
        unref(isRequestingPin) ||
        warningMessage.actions?.includes(enterPinAction) ||
        !hasPendingPin()
      ) {
        return
      }
      if (isExpired()) {
        showExpired()
        return
      }
      showExpiryWarning()
    }

    expiryCheck = setInterval(checkExpiry, expiryCheckInterval)
    checkExpiry()
  }

  // another tab might request the PIN while the warning is shown
  function onStorage({ key }: StorageEvent) {
    if (key === renewalStorageKey) {
      syncPendingPin?.()
    }
  }

  window.addEventListener('storage', onStorage)

  watch(
    [
      () => (authStore.isGuestContext ? authStore.guestPermissionId : undefined),
      () => authStore.guestSessionExpirationDateTime
    ],
    ([permissionId, expirationDateTime], [previousPermissionId]) => {
      const wasWarned = !!warningMessage
      dismissWarning()
      if (!permissionId || !expirationDateTime) {
        return
      }
      // the session got refreshed, e.g. via PIN or via the link of the renewal in another tab
      if (wasWarned && permissionId === previousPermissionId) {
        messageStore.showMessage({ title: $gettext('Your session has been renewed') })
      }
      scheduleWarning(permissionId, expirationDateTime)
    },
    { immediate: true }
  )

  onScopeDispose(() => {
    window.removeEventListener('storage', onStorage)
    dismissWarning()
  })
}
