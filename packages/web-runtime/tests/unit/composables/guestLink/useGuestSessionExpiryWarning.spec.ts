import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import { AxiosError, AxiosResponse } from 'axios'
import { Message, useAuthStore, useMessages, useModals } from '@opencloud-eu/web-pkg'
import { mock } from 'vitest-mock-extended'
import { NavigationFailure, RouteLocationNormalizedLoaded } from 'vue-router'
import { defaultComponentMocks, getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useGuestSessionExpiryWarning } from '../../../../src/composables/guestLink'
import GuestSessionPinModal from '../../../../src/components/GuestSessionPinModal.vue'
import { authService } from '../../../../src/services/auth'

vi.mock('../../../../src/services/auth')

const now = new Date('2026-10-22T12:00:00Z').getTime()
const minutes = (count: number) => count * 60 * 1000
const expiresIn = (duration: number) => new Date(now + duration).toISOString()

enableAutoUnmount(afterEach)

describe('useGuestSessionExpiryWarning', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now })
    vi.mocked(authService.getPendingGuestLinkRenewal).mockReturnValue(undefined)
    // a renewal with PIN stays pending
    vi.mocked(authService.ensureGuestLinkRenewal).mockImplementation(() => {
      vi.mocked(authService.getPendingGuestLinkRenewal).mockReturnValue({ withPin: true })
      return Promise.resolve({ withPin: true })
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('warns 15 minutes before the session expires', async () => {
    getWrapper({ expirationDateTime: expiresIn(minutes(60)) })
    const { showMessage } = useMessages()

    await vi.advanceTimersByTimeAsync(minutes(44))
    expect(showMessage).not.toHaveBeenCalled()
    expect(authService.ensureGuestLinkRenewal).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(minutes(1))
    expect(showMessage).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Your session expires soon', timeout: 0 })
    )
  })

  it('does not request a PIN without the guest asking for it', async () => {
    getWrapper({ expirationDateTime: expiresIn(minutes(10)) })
    await flushPromises()

    expect(getWarning().actions.map(({ name }) => name)).toEqual(['request-guest-session-pin'])
    expect(authService.ensureGuestLinkRenewal).not.toHaveBeenCalled()
  })

  it('warns right away when the session expires within 15 minutes', async () => {
    getWrapper({ expirationDateTime: expiresIn(minutes(10)) })
    await flushPromises()

    expect(useMessages().showMessage).toHaveBeenCalledTimes(1)
  })

  it('offers to enter the PIN once it was requested', async () => {
    getWrapper({ expirationDateTime: expiresIn(minutes(10)) })
    await requestPin()

    expect(authService.ensureGuestLinkRenewal).toHaveBeenCalledWith('permission-id')
    expect(useMessages().removeMessage).toHaveBeenCalledWith(getWarning(0))
    const [action] = getWarning().actions
    expect(action.label()).toEqual('Enter PIN')
    action.handler()

    expect(useModals().dispatchModal).toHaveBeenCalledWith(
      expect.objectContaining({
        customComponent: GuestSessionPinModal,
        focusTrapInitial: '#guest-session-pin-input'
      })
    )
    const [{ customComponentAttrs }] = vi.mocked(useModals().dispatchModal).mock.calls[0]
    expect(customComponentAttrs()).toEqual({ permissionId: 'permission-id' })
  })

  it('offers to enter the PIN another tab requested', async () => {
    vi.mocked(authService.getPendingGuestLinkRenewal).mockReturnValue({ withPin: true })
    getWrapper({ expirationDateTime: expiresIn(minutes(10)) })
    await flushPromises()

    expect(getWarning().actions.map(({ name }) => name)).toEqual(['enter-guest-session-pin'])
  })

  it('does not offer to enter a PIN when it was requested after the session expired', async () => {
    vi.mocked(authService.ensureGuestLinkRenewal).mockResolvedValue({ withPin: false })
    getWrapper({ expirationDateTime: expiresIn(minutes(10)) })
    await flushPromises()

    const [action] = getWarning().actions
    // e.g. the device slept, so the expiry check didn't run yet
    vi.setSystemTime(now + minutes(11))
    action.handler()
    await flushPromises()

    expect(getWarning()).toEqual(
      expect.objectContaining({
        title: 'Your session has expired',
        desc: 'Open the invitation link from your most recent email to continue. If it has expired or has already been used, a new one is on its way.',
        actions: []
      })
    )
  })

  it('offers to request a new invitation once the session expired', async () => {
    getWrapper({ expirationDateTime: expiresIn(minutes(10)) })
    await flushPromises()

    await vi.advanceTimersByTimeAsync(minutes(10))

    expect(useMessages().removeMessage).toHaveBeenCalledWith(getWarning(0))
    expect(getWarning()).toEqual(
      expect.objectContaining({
        title: 'Your session has expired',
        desc: 'Request a new invitation by email to continue.'
      })
    )
    expect(getWarning().actions.map(({ name }) => name)).toEqual(['request-guest-invitation'])
    expect(authService.ensureGuestLinkRenewal).not.toHaveBeenCalled()
  })

  it('opens the renew page to request a new invitation', async () => {
    const { mocks } = getWrapper({
      expirationDateTime: expiresIn(-minutes(1)),
      currentRoute: mock<RouteLocationNormalizedLoaded>({
        fullPath: '/files/spaces/guest/1',
        meta: { authContext: 'guest' }
      })
    })
    await flushPromises()
    const warning = getWarning()

    warning.actions[0].handler()
    await flushPromises()

    expect(useMessages().removeMessage).toHaveBeenCalledWith(warning)
    expect(mocks.$router.replace).toHaveBeenCalledWith({
      name: 'renewGuestLink',
      params: { permissionId: 'permission-id' },
      query: { redirectUrl: '/files/spaces/guest/1' }
    })
  })

  it('keeps the warning when the guest stays on the page', async () => {
    const { mocks } = getWrapper({ expirationDateTime: expiresIn(-minutes(1)) })
    vi.mocked(mocks.$router.replace).mockResolvedValue(mock<NavigationFailure>())
    await flushPromises()
    const warning = getWarning()

    warning.actions[0].handler()
    await flushPromises()

    expect(mocks.$router.replace).toHaveBeenCalled()
    expect(useMessages().removeMessage).not.toHaveBeenCalledWith(warning)
  })

  it('still offers to enter a PIN requested before the session expired', async () => {
    getWrapper({ expirationDateTime: expiresIn(minutes(10)) })
    await requestPin()

    await vi.advanceTimersByTimeAsync(minutes(10))

    expect(getWarning().title).toEqual('Your session has expired')
    expect(getWarning().actions.map(({ name }) => name)).toEqual(['enter-guest-session-pin'])
  })

  it('offers to request a new invitation once the PIN expired after the session', async () => {
    getWrapper({ expirationDateTime: expiresIn(minutes(10)) })
    await requestPin()
    await vi.advanceTimersByTimeAsync(minutes(10))
    expect(getWarning().actions.map(({ name }) => name)).toEqual(['enter-guest-session-pin'])
    const warningCount = vi.mocked(useMessages().showMessage).mock.calls.length

    // the PIN is still pending, so the warning doesn't change
    await vi.advanceTimersByTimeAsync(minutes(5))
    expect(useMessages().showMessage).toHaveBeenCalledTimes(warningCount)

    vi.mocked(authService.getPendingGuestLinkRenewal).mockReturnValue(undefined)
    await vi.advanceTimersByTimeAsync(30 * 1000)

    expect(getWarning().title).toEqual('Your session has expired')
    expect(getWarning().actions.map(({ name }) => name)).toEqual(['request-guest-invitation'])

    await vi.advanceTimersByTimeAsync(minutes(10))
    expect(useMessages().showMessage).toHaveBeenCalledTimes(warningCount + 1)
  })

  it('offers to request the PIN again once it got unusable before the session expired', async () => {
    getWrapper({ expirationDateTime: expiresIn(minutes(10)) })
    await requestPin()

    vi.mocked(authService.getPendingGuestLinkRenewal).mockReturnValue(undefined)
    await vi.advanceTimersByTimeAsync(30 * 1000)

    expect(getWarning().title).toEqual('Your session expires soon')
    expect(getWarning().actions.map(({ name }) => name)).toEqual(['request-guest-session-pin'])
  })

  it('keeps telling to open the newest email once the session expired', async () => {
    vi.mocked(authService.ensureGuestLinkRenewal).mockResolvedValue({ withPin: false })
    getWrapper({ expirationDateTime: expiresIn(minutes(10)) })
    await flushPromises()

    vi.setSystemTime(now + minutes(11))
    getWarning().actions[0].handler()
    await flushPromises()
    await vi.advanceTimersByTimeAsync(minutes(1))

    expect(getWarning().actions).toEqual([])
    expect(getWarning().desc).toMatch(/^Open the invitation link from your most recent email/)
  })

  it('offers to request the PIN again when the request fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(authService.ensureGuestLinkRenewal).mockRejectedValue(new Error('429'))
    getWrapper({ expirationDateTime: expiresIn(minutes(10)) })
    await requestPin()

    expect(getWarning().desc).toEqual('A PIN could not be requested. Please try again later.')
    expect(getWarning().actions.map(({ name }) => name)).toEqual(['request-guest-session-pin'])
  })

  it('shows that the session expired when the PIN request fails after it did', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(authService.ensureGuestLinkRenewal).mockRejectedValue(new Error('429'))
    getWrapper({ expirationDateTime: expiresIn(minutes(10)) })
    await flushPromises()

    const [action] = getWarning().actions
    vi.setSystemTime(now + minutes(11))
    action.handler()
    await flushPromises()

    expect(getWarning().title).toEqual('Your session has expired')
    expect(getWarning().actions.map(({ name }) => name)).toEqual(['request-guest-invitation'])
  })

  it('tells when the share is no longer available instead of offering a retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(authService.ensureGuestLinkRenewal).mockRejectedValue(
      new AxiosError('404', '404', undefined, undefined, {
        status: 404,
        data: { errorType: 'shareNotFound' }
      } as AxiosResponse)
    )
    getWrapper({ expirationDateTime: expiresIn(minutes(10)) })
    await requestPin()

    expect(getWarning().desc).toEqual('The shared item is no longer available.')
    expect(getWarning().actions).toEqual([])
  })

  it('does not offer a retry when the PIN request fails for good', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(authService.ensureGuestLinkRenewal).mockRejectedValue(
      new AxiosError('400', '400', undefined, undefined, {
        status: 400,
        data: { errorType: 'invalidRequest' }
      } as AxiosResponse)
    )
    getWrapper({ expirationDateTime: expiresIn(minutes(10)) })
    await requestPin()

    expect(getWarning().desc).toMatch(/^A PIN could not be requested\. Save your changes/)
    expect(getWarning().actions).toEqual([])
  })

  it('offers to enter the PIN once another tab requested it', async () => {
    getWrapper({ expirationDateTime: expiresIn(minutes(10)) })
    await flushPromises()

    vi.mocked(authService.getPendingGuestLinkRenewal).mockReturnValue({ withPin: true })
    window.dispatchEvent(new StorageEvent('storage', { key: 'oc.guestLinkRenewal' }))

    expect(useMessages().removeMessage).toHaveBeenCalledWith(getWarning(0))
    expect(getWarning().actions.map(({ name }) => name)).toEqual(['enter-guest-session-pin'])
  })

  it('ignores unrelated storage changes while the warning is shown', async () => {
    getWrapper({ expirationDateTime: expiresIn(minutes(10)) })
    await flushPromises()

    vi.mocked(authService.getPendingGuestLinkRenewal).mockReturnValue({ withPin: true })
    window.dispatchEvent(new StorageEvent('storage', { key: 'other-key' }))

    expect(useMessages().showMessage).toHaveBeenCalledTimes(1)
  })

  it('tells when the PIN can be requested again after too many requests', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(authService.ensureGuestLinkRenewal).mockRejectedValue(
      new AxiosError('429', '429', undefined, undefined, {
        status: 429,
        data: { errorType: 'tooManyRequests', retryAfter: 300 }
      } as AxiosResponse)
    )
    getWrapper({ expirationDateTime: expiresIn(minutes(10)) })
    await requestPin()

    expect(getWarning().desc).toEqual(
      'Too many PINs were requested. Please try again in 5 minutes.'
    )
  })

  it('does not offer to request the PIN again until the rate limit ends', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(authService.ensureGuestLinkRenewal).mockRejectedValue(
      new AxiosError('429', '429', undefined, undefined, {
        status: 429,
        data: { errorType: 'tooManyRequests', retryAfter: 300 }
      } as AxiosResponse)
    )
    getWrapper({ expirationDateTime: expiresIn(minutes(10)) })
    await requestPin()
    const [action] = getWarning().actions

    expect(action.isDisabled()).toBe(true)
    action.handler()
    expect(authService.ensureGuestLinkRenewal).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(minutes(5) + 30 * 1000)
    expect(action.isDisabled()).toBe(false)
    expect(getWarning().desc).toMatch(/^Your session expires at .*request a PIN by email/)
  })

  it('requests the PIN only once while the request is pending', async () => {
    vi.mocked(authService.ensureGuestLinkRenewal).mockReturnValue(new Promise(() => undefined))
    getWrapper({ expirationDateTime: expiresIn(minutes(10)) })
    await flushPromises()
    const [action] = getWarning().actions

    action.handler()
    expect(action.isDisabled()).toBe(true)
    action.handler()

    expect(authService.ensureGuestLinkRenewal).toHaveBeenCalledTimes(1)
  })

  it('keeps telling about too many requests without a retry time', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(authService.ensureGuestLinkRenewal).mockRejectedValue(
      new AxiosError('429', '429', undefined, undefined, {
        status: 429,
        data: { errorType: 'tooManyRequests' }
      } as AxiosResponse)
    )
    getWrapper({ expirationDateTime: expiresIn(minutes(10)) })
    await requestPin()
    const warningCount = vi.mocked(useMessages().showMessage).mock.calls.length

    await vi.advanceTimersByTimeAsync(minutes(1))

    expect(useMessages().showMessage).toHaveBeenCalledTimes(warningCount)
    expect(getWarning().desc).toEqual('Too many PINs were requested. Please try again later.')
    expect(getWarning().actions[0].isDisabled()).toBe(false)
  })

  it('does not offer a retry once the retry time of a failure for good passed', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(authService.ensureGuestLinkRenewal).mockRejectedValue(
      new AxiosError('404', '404', undefined, undefined, {
        status: 404,
        data: { errorType: 'shareNotFound', retryAfter: 60 }
      } as AxiosResponse)
    )
    getWrapper({ expirationDateTime: expiresIn(minutes(10)) })
    await requestPin()

    await vi.advanceTimersByTimeAsync(minutes(2))

    expect(getWarning().desc).toEqual('The shared item is no longer available.')
    expect(getWarning().actions).toEqual([])
  })

  it('shows the warning again when the PIN request fails again', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(authService.ensureGuestLinkRenewal).mockRejectedValue(new Error('500'))
    getWrapper({ expirationDateTime: expiresIn(minutes(10)) })
    await requestPin()
    const warning = getWarning()
    const warningCount = vi.mocked(useMessages().showMessage).mock.calls.length

    warning.actions[0].handler()
    await flushPromises()

    expect(useMessages().removeMessage).toHaveBeenCalledWith(warning)
    expect(useMessages().showMessage).toHaveBeenCalledTimes(warningCount + 1)
    expect(getWarning().desc).toEqual('A PIN could not be requested. Please try again later.')
  })

  it('offers to enter the PIN another tab requested while the request is pending', async () => {
    let resolveRenewal: (value: { withPin: boolean }) => void
    vi.mocked(authService.ensureGuestLinkRenewal).mockReturnValue(
      new Promise((resolve) => (resolveRenewal = resolve))
    )
    getWrapper({ expirationDateTime: expiresIn(minutes(10)) })
    await flushPromises()
    getWarning().actions[0].handler()

    vi.mocked(authService.getPendingGuestLinkRenewal).mockReturnValue({ withPin: true })
    window.dispatchEvent(new StorageEvent('storage', { key: 'oc.guestLinkRenewal' }))
    expect(getWarning().actions.map(({ name }) => name)).toEqual(['enter-guest-session-pin'])
    const warningCount = vi.mocked(useMessages().showMessage).mock.calls.length

    resolveRenewal({ withPin: true })
    await flushPromises()

    expect(useMessages().showMessage).toHaveBeenCalledTimes(warningCount)
  })

  it('drops a failed PIN request once another tab requested the PIN', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(authService.ensureGuestLinkRenewal).mockRejectedValue(new Error('500'))
    getWrapper({ expirationDateTime: expiresIn(minutes(10)) })
    await requestPin()

    vi.mocked(authService.getPendingGuestLinkRenewal).mockReturnValue({ withPin: true })
    window.dispatchEvent(new StorageEvent('storage', { key: 'oc.guestLinkRenewal' }))
    expect(getWarning().actions.map(({ name }) => name)).toEqual(['enter-guest-session-pin'])

    vi.mocked(authService.getPendingGuestLinkRenewal).mockReturnValue(undefined)
    await vi.advanceTimersByTimeAsync(30 * 1000)

    expect(getWarning().desc).toMatch(/^Your session expires at .*request a PIN by email/)
    expect(getWarning().actions.map(({ name }) => name)).toEqual(['request-guest-session-pin'])
  })

  it('drops a requested invitation once another tab requested the PIN', async () => {
    vi.mocked(authService.ensureGuestLinkRenewal).mockResolvedValue({ withPin: false })
    getWrapper({ expirationDateTime: expiresIn(minutes(10)) })
    await requestPin()
    expect(getWarning().desc).toMatch(/^Open the invitation link from your most recent email/)

    vi.mocked(authService.getPendingGuestLinkRenewal).mockReturnValue({ withPin: true })
    window.dispatchEvent(new StorageEvent('storage', { key: 'oc.guestLinkRenewal' }))
    expect(getWarning().actions.map(({ name }) => name)).toEqual(['enter-guest-session-pin'])

    vi.mocked(authService.getPendingGuestLinkRenewal).mockReturnValue(undefined)
    await vi.advanceTimersByTimeAsync(30 * 1000)

    expect(getWarning().actions.map(({ name }) => name)).toEqual(['request-guest-session-pin'])
  })

  it('shows that the session expired when it already did', async () => {
    getWrapper({ expirationDateTime: expiresIn(-minutes(1)) })
    await flushPromises()

    expect(useMessages().showMessage).toHaveBeenCalledTimes(1)
    expect(getWarning().title).toEqual('Your session has expired')
  })

  it('does not warn without a session expiry', async () => {
    getWrapper({ expirationDateTime: undefined })
    await vi.advanceTimersByTimeAsync(minutes(60))

    expect(useMessages().showMessage).not.toHaveBeenCalled()
  })

  it('does not warn a signed in user', async () => {
    getWrapper({ expirationDateTime: expiresIn(minutes(10)), userContextReady: true })
    await flushPromises()

    expect(useMessages().showMessage).not.toHaveBeenCalled()
  })

  it('dismisses the warning and confirms once the session got refreshed', async () => {
    getWrapper({ expirationDateTime: expiresIn(minutes(10)) })
    await requestPin()
    const warning = getWarning()
    const pinModal = { id: 'pin-modal' }
    vi.mocked(useModals().dispatchModal).mockReturnValue(pinModal as any)
    warning.actions[0].handler()

    useAuthStore().guestSessionExpirationDateTime = expiresIn(minutes(24 * 60))
    await flushPromises()

    expect(useMessages().removeMessage).toHaveBeenCalledWith(warning)
    expect(useModals().removeModal).toHaveBeenCalledWith('pin-modal')
    expect(useMessages().showMessage).toHaveBeenLastCalledWith({
      title: 'Your session has been renewed'
    })
  })

  it('schedules the warning of the refreshed session', async () => {
    getWrapper({ expirationDateTime: expiresIn(minutes(10)) })
    await flushPromises()

    useAuthStore().guestSessionExpirationDateTime = expiresIn(minutes(60))
    await vi.advanceTimersByTimeAsync(minutes(44))
    expect(getWarning().title).toEqual('Your session has been renewed')

    await vi.advanceTimersByTimeAsync(minutes(1))
    expect(getWarning().title).toEqual('Your session expires soon')
  })

  it('dismisses the warning without confirmation once the guest context ends', async () => {
    getWrapper({ expirationDateTime: expiresIn(minutes(10)) })
    await flushPromises()
    const warning = getWarning()

    useAuthStore().guestContextReady = false
    await flushPromises()

    expect(useMessages().removeMessage).toHaveBeenCalledWith(warning)
    expect(useMessages().showMessage).toHaveBeenCalledTimes(1)
  })

  it('does not show a warning of a session that changed during the PIN request', async () => {
    let resolveRenewal: (value: { withPin: boolean }) => void
    vi.mocked(authService.ensureGuestLinkRenewal).mockReturnValue(
      new Promise((resolve) => (resolveRenewal = resolve))
    )
    getWrapper({ expirationDateTime: expiresIn(minutes(10)) })
    await flushPromises()
    getWarning().actions[0].handler()

    useAuthStore().guestContextReady = false
    await flushPromises()
    resolveRenewal({ withPin: true })
    await flushPromises()

    expect(useMessages().showMessage).toHaveBeenCalledTimes(1)
  })
})

// the latest warning by default
function getWarning(index = -1) {
  return vi.mocked(useMessages().showMessage).mock.calls.at(index)[0] as Message
}

async function requestPin() {
  await flushPromises()
  getWarning().actions[0].handler()
  await flushPromises()
}

function getWrapper({
  expirationDateTime,
  userContextReady = false,
  currentRoute = undefined
}: {
  expirationDateTime: string | undefined
  userContextReady?: boolean
  currentRoute?: RouteLocationNormalizedLoaded
}) {
  const mocks = defaultComponentMocks({ currentRoute })
  const wrapper = getComposableWrapper(
    () => {
      vi.mocked(useMessages().showMessage).mockImplementation((data) => data as Message)
      useGuestSessionExpiryWarning()
    },
    {
      mocks,
      provide: mocks,
      pluginOptions: {
        piniaOptions: {
          authState: {
            guestContextReady: true,
            guestPermissionId: 'permission-id',
            guestSessionExpirationDateTime: expirationDateTime,
            userContextReady
          }
        }
      }
    }
  )
  return { wrapper, mocks }
}
