import { ref } from 'vue'
import { AxiosError, AxiosResponse } from 'axios'
import { mock, mockDeep } from 'vitest-mock-extended'
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import { useRouteParam, useRouteQuery } from '@opencloud-eu/web-pkg'
import { ShareSpaceResource } from '@opencloud-eu/web-client'
import { RouteLocationResolved } from 'vue-router'
import { Settings } from 'luxon'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import RenewGuestLink from '../../../src/pages/renewGuestLink.vue'
import { authService } from '../../../src/services/auth'
import { GuestLinkRenewal, GuestSession } from '../../../src/services/auth/guestSessionManager'

vi.mock('../../../src/services/auth')
const { getGuestLinkTargetRoute } = vi.hoisted(() => ({
  getGuestLinkTargetRoute: vi.fn(({ permissionId, space }: GuestSession) =>
    Promise.resolve({
      name: 'files-guest-link',
      params: { driveAliasAndItem: space.driveAlias },
      query: { shareId: space.id, permissionId }
    })
  )
}))
vi.mock('../../../src/composables/guestLink', () => ({
  useGuestLinkTargetRoute: () => ({ getGuestLinkTargetRoute })
}))

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useRouteParam: vi.fn(),
  useRouteQuery: vi.fn()
}))

const selectors = {
  spinner: '.oc-spinner',
  errorMessage: '[data-testid="error-message"]',
  retryButton: '[data-testid="retry-button"]',
  pinInput: 'input[data-testid="pin-input"]',
  pinSubmit: '[data-testid="pin-submit"]'
}

const guestRedirectUrl = '/files/guest/share/folder/sub?permissionId=permission-id'

enableAutoUnmount(afterEach)

const defaultNow = Settings.now
afterEach(() => {
  Settings.now = defaultNow
})

describe('renewGuestLink', () => {
  it('shows a spinner while renewing', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find(selectors.spinner).exists()).toBeTruthy()
  })

  it('renews the link of the permission id from the route', async () => {
    getWrapper()
    await flushPromises()

    expect(authService.renewGuestLink).toHaveBeenCalledWith('permission-id')
  })

  it('asks to open the new link after a renewal without pin', async () => {
    const { wrapper } = getWrapper({ withPin: false })
    await flushPromises()

    expect(wrapper.text()).toContain('Check your inbox')
    expect(wrapper.text()).toContain(
      'Your access has expired. Open the invitation link from your most recent email to continue. If it has expired or has already been used, a new one is on its way.'
    )
    expect(wrapper.find(selectors.pinInput).exists()).toBeFalsy()
    expect(wrapper.find(selectors.spinner).exists()).toBeFalsy()
  })

  it('announces a new link when the opened link can no longer be used', async () => {
    const { wrapper } = getWrapper({ withPin: false, query: { linkUnusable: 'true' } })
    await flushPromises()

    expect(wrapper.text()).toContain('Check your inbox')
    expect(wrapper.text()).toContain(
      'This invitation link can no longer be used. We sent you an email with a new one, open it to continue.'
    )
    expect(wrapper.text()).not.toContain('most recent email')
  })

  it('shows the pin form after a renewal with pin', async () => {
    const { wrapper } = getWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('Check your inbox')
    expect(wrapper.text()).toContain('Open the link or enter the PIN to continue.')
    expect(wrapper.find(selectors.pinInput).exists()).toBeTruthy()
  })

  it('shows the pin form without renewing again while a renewal with pin is pending', async () => {
    const { wrapper } = getWrapper({ pendingRenewal: { withPin: true } })
    await flushPromises()

    expect(authService.getPendingGuestLinkRenewal).toHaveBeenCalledWith('permission-id')
    expect(authService.renewGuestLink).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Check your inbox')
    expect(wrapper.find(selectors.pinInput).exists()).toBeTruthy()
  })

  it.each([
    ['shareExpired', 'Your access to the shared item has expired.'],
    ['shareNotFound', 'The shared item is no longer available.'],
    ['tokenNotFound', 'The shared item is no longer available.']
  ])('asks to contact the inviter for %s', async (errorType, message) => {
    const { wrapper } = getWrapper({ renewError: guestLinkError(errorType) })
    await flushPromises()

    expect(wrapper.find(selectors.errorMessage).text()).toEqual(message)
    expect(wrapper.text()).toContain('Ask the person who invited you for a new invitation.')
    expect(wrapper.find(selectors.retryButton).exists()).toBeFalsy()
    expect(wrapper.find(selectors.pinInput).exists()).toBeFalsy()
  })

  it('points to the most recent email for tokenInvalid', async () => {
    const { wrapper } = getWrapper({ renewError: guestLinkError('tokenInvalid') })
    await flushPromises()

    expect(wrapper.find(selectors.errorMessage).text()).toEqual(
      'A new invitation could not be requested. Open the invitation link from your most recent email instead.'
    )
    expect(wrapper.text()).not.toContain('Ask the person who invited you')
    expect(wrapper.find(selectors.retryButton).exists()).toBeFalsy()
    expect(wrapper.find(selectors.pinInput).exists()).toBeFalsy()
  })

  it('asks to try again later when too many renewals were requested', async () => {
    const { wrapper } = getWrapper({ renewError: guestLinkError('tooManyRequests') })
    await flushPromises()

    expect(wrapper.find(selectors.errorMessage).text()).toEqual(
      'Too many new invitations were requested. Please try again later.'
    )
    expect(wrapper.text()).not.toContain('Ask the person who invited you')
    expect(wrapper.find(selectors.retryButton).exists()).toBeTruthy()
    expect(wrapper.find(selectors.pinInput).exists()).toBeFalsy()
  })

  it('tells how long to wait when too many renewals were requested', async () => {
    // time passes between receiving the error and rendering the wait time
    Settings.now = () => Date.now() + 1000
    const { wrapper } = getWrapper({ renewError: guestLinkError('tooManyRequests', 300) })
    await flushPromises()

    expect(wrapper.find(selectors.errorMessage).text()).toEqual(
      'Too many new invitations were requested. Please try again in 5 minutes.'
    )
  })

  it('renews again on retry after too many renewals were requested', async () => {
    const { wrapper } = getWrapper({ renewError: guestLinkError('tooManyRequests', 60) })
    await flushPromises()

    vi.mocked(authService.renewGuestLink).mockResolvedValue({ withPin: false })
    await wrapper.find(selectors.retryButton).trigger('click')
    await flushPromises()

    expect(authService.renewGuestLink).toHaveBeenCalledTimes(2)
    expect(wrapper.find(selectors.errorMessage).exists()).toBeFalsy()
    expect(wrapper.text()).toContain('Check your inbox')
  })

  it('shows the pin form when another tab renewed the link meanwhile', async () => {
    const { wrapper, setPendingRenewal } = getWrapper({
      renewError: guestLinkError('tokenInvalid')
    })
    // the mount already checked for a pending renewal
    setPendingRenewal({ withPin: true })
    await flushPromises()

    expect(wrapper.find(selectors.errorMessage).exists()).toBeFalsy()
    expect(wrapper.find(selectors.pinInput).exists()).toBeTruthy()
  })

  it.each([
    ['an internal server error', guestLinkError('internalError')],
    ['an unavailable service', guestLinkError('serviceUnavailable')],
    ['a conflict', guestLinkError('conflict')],
    ['an unexpected error', new Error('network')]
  ])('offers a retry on %s', async (_, renewError) => {
    const { wrapper, setPendingRenewal } = getWrapper({ renewError })
    await flushPromises()

    expect(wrapper.find(selectors.errorMessage).text()).toEqual(
      'A new invitation could not be requested. Please try again later.'
    )

    vi.mocked(authService.renewGuestLink).mockImplementation(() => {
      setPendingRenewal({ withPin: true })
      return Promise.resolve({ withPin: true })
    })
    await wrapper.find(selectors.retryButton).trigger('click')
    await flushPromises()

    expect(authService.renewGuestLink).toHaveBeenCalledTimes(2)
    expect(wrapper.find(selectors.pinInput).exists()).toBeTruthy()
  })

  it('verifies the pin and redirects to the guest link page', async () => {
    const { wrapper, mocks } = getWrapper()
    await flushPromises()

    await wrapper.find(selectors.pinInput).setValue('123456')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(authService.verifyGuestLinkPin).toHaveBeenCalledWith('permission-id', '123456')
    expect(authService.resumeGuestSession).toHaveBeenCalledWith('permission-id')
    expect(mocks.$router.replace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'files-guest-link',
        params: { driveAliasAndItem: 'share/Invited folder' },
        query: { shareId: 'share-id', permissionId: 'permission-id' }
      })
    )
  })

  it('strips whitespace from a pasted pin', async () => {
    const { wrapper } = getWrapper()
    await flushPromises()

    await wrapper.find(selectors.pinInput).setValue(' 123 456\n')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(authService.verifyGuestLinkPin).toHaveBeenCalledWith('permission-id', '123456')
  })

  it.each([
    ['pinInvalid', 'The PIN is incorrect.'],
    [
      'pinExpired',
      'The PIN has expired. Open the invitation link from your most recent email to get a new one.'
    ],
    [
      'nonceExpired',
      'The PIN has expired. Open the invitation link from your most recent email to get a new one.'
    ],
    [
      'invalidRequest',
      'The PIN has expired. Open the invitation link from your most recent email to get a new one.'
    ],
    [
      'nonceInvalid',
      'The PIN only works in the browser it was requested in. Open the invitation link from your most recent email instead.'
    ],
    ['tooManyRequests', 'Too many attempts. Please try again later.'],
    ['shareExpired', 'Your access to the shared item has expired.'],
    ['tokenNotFound', 'The shared item is no longer available.'],
    ['internalError', 'The PIN could not be verified. Please try again later.']
  ])('shows an error for %s', async (errorType, message) => {
    const { wrapper, mocks } = getWrapper({ pinError: guestLinkError(errorType) })
    await flushPromises()

    await wrapper.find(selectors.pinInput).setValue('000000')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.findComponent({ name: 'OcTextInput' }).props('errorMessage')).toEqual(message)
    expect(mocks.$router.replace).not.toHaveBeenCalled()
  })

  it('disables the submit button for a pin of whitespace only', async () => {
    const { wrapper } = getWrapper()
    await flushPromises()

    await wrapper.find(selectors.pinInput).setValue(' \n')

    expect(wrapper.find(selectors.pinSubmit).attributes('disabled')).toBeDefined()
  })

  it('offers to retry loading the session when it fails after verifying the pin', async () => {
    const { wrapper, mocks } = getWrapper({ resumeError: new Error('503') })
    await flushPromises()
    await wrapper.find(selectors.pinInput).setValue('123456')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find(selectors.errorMessage).text()).toEqual(
      'The shared item could not be loaded. Please try again later.'
    )

    let resolveResume: (session: GuestSession) => void
    vi.mocked(authService.resumeGuestSession).mockReturnValue(
      new Promise((resolve) => (resolveResume = resolve))
    )
    await wrapper.find(selectors.retryButton).trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Opening the shared item…')
    expect(wrapper.find(selectors.spinner).exists()).toBeTruthy()
    expect(wrapper.find(selectors.pinInput).exists()).toBeFalsy()

    resolveResume(guestSession())
    await flushPromises()

    expect(authService.verifyGuestLinkPin).toHaveBeenCalledTimes(1)
    expect(authService.resumeGuestSession).toHaveBeenCalledTimes(2)
    expect(mocks.$router.replace).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'files-guest-link' })
    )
  })

  it('does not resume when the pin is rejected', async () => {
    const { wrapper } = getWrapper({ pinError: guestLinkError('pinInvalid') })
    await flushPromises()

    await wrapper.find(selectors.pinInput).setValue('123456')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.findComponent({ name: 'OcTextInput' }).props('errorMessage')).toEqual(
      'The PIN is incorrect.'
    )
    expect(authService.resumeGuestSession).not.toHaveBeenCalled()
  })

  it('falls back to the renewal when the session is invalid after verifying the pin', async () => {
    const { wrapper, setPendingRenewal } = getWrapper({ resumeError: sessionExpiredError() })
    await flushPromises()
    vi.mocked(authService.renewGuestLink).mockImplementation(() => {
      setPendingRenewal({ withPin: false })
      return Promise.resolve({ withPin: false })
    })

    await wrapper.find(selectors.pinInput).setValue('123456')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(authService.renewGuestLink).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain(
      'Open the invitation link from your most recent email to continue.'
    )
    expect(wrapper.find(selectors.pinInput).exists()).toBeFalsy()
  })

  it('asks to contact the inviter when the share of a persisted session is gone', async () => {
    const { wrapper } = getWrapper({
      hasGuestSession: true,
      resumeError: guestLinkError('shareNotFound')
    })
    await flushPromises()

    expect(wrapper.find(selectors.errorMessage).text()).toEqual(
      'The shared item is no longer available.'
    )
    expect(wrapper.text()).toContain('Ask the person who invited you for a new invitation.')
    expect(wrapper.find(selectors.retryButton).exists()).toBeFalsy()
  })

  it('resumes a persisted session without renewing', async () => {
    const { mocks } = getWrapper({ hasGuestSession: true })
    await flushPromises()

    expect(authService.resumeGuestSession).toHaveBeenCalledWith('permission-id')
    expect(authService.renewGuestLink).not.toHaveBeenCalled()
    expect(mocks.$router.replace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'files-guest-link',
        query: { shareId: 'share-id', permissionId: 'permission-id' }
      })
    )
  })

  it('does not log an error once opening the shared item unmounts the page', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { wrapper, mocks } = getWrapper({ hasGuestSession: true })
    mocks.$router.replace.mockImplementation(() => {
      wrapper.unmount()
      return Promise.resolve(undefined)
    })
    await flushPromises()

    expect(mocks.$router.replace).toHaveBeenCalled()
    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })

  it('opens the redirect url after resuming the session', async () => {
    const { mocks } = getWrapper({
      hasGuestSession: true,
      query: { redirectUrl: guestRedirectUrl }
    })
    mocks.$router.resolve.mockReturnValue(
      mock<RouteLocationResolved>({ meta: { authContext: 'guest' } })
    )
    await flushPromises()

    expect(mocks.$router.replace).toHaveBeenCalledWith({
      path: '/files/guest/share/folder/sub',
      query: { permissionId: 'permission-id' }
    })
    expect(getGuestLinkTargetRoute).not.toHaveBeenCalled()
  })

  it('keeps nested context query params of the redirect url', async () => {
    const { mocks } = getWrapper({
      hasGuestSession: true,
      query: {
        redirectUrl:
          '/preview/share/file.png?contextRouteName=files-guest-link&contextRouteParams.driveAliasAndItem=share/folder&contextRouteQuery.permissionId=permission-id'
      }
    })
    mocks.$router.resolve.mockReturnValue(
      mock<RouteLocationResolved>({ meta: { authContext: 'guest' } })
    )
    await flushPromises()

    expect(mocks.$router.replace).toHaveBeenCalledWith({
      path: '/preview/share/file.png',
      query: {
        contextRouteName: 'files-guest-link',
        contextRouteParams: { driveAliasAndItem: 'share/folder' },
        contextRouteQuery: { permissionId: 'permission-id' }
      }
    })
  })

  it('opens the redirect url after verifying the pin', async () => {
    const { wrapper, mocks } = getWrapper({ query: { redirectUrl: guestRedirectUrl } })
    mocks.$router.resolve.mockReturnValue(
      mock<RouteLocationResolved>({ meta: { authContext: 'guest' } })
    )
    await flushPromises()

    await wrapper.find(selectors.pinInput).setValue('123456')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mocks.$router.replace).toHaveBeenCalledWith({
      path: '/files/guest/share/folder/sub',
      query: { permissionId: 'permission-id' }
    })
  })

  it('opens a private link redirect url after resuming the session', async () => {
    const { mocks } = getWrapper({
      hasGuestSession: true,
      query: { redirectUrl: '/f/file-id' }
    })
    mocks.$router.resolve.mockReturnValue(
      mock<RouteLocationResolved>({ name: 'resolvePrivateLink', meta: { authContext: 'user' } })
    )
    await flushPromises()

    expect(mocks.$router.replace).toHaveBeenCalledWith({ path: '/f/file-id' })
    expect(getGuestLinkTargetRoute).not.toHaveBeenCalled()
  })

  it('opens the shared item instead of a redirect url outside of guest routes', async () => {
    const { mocks } = getWrapper({
      hasGuestSession: true,
      query: { redirectUrl: '/files/spaces/personal' }
    })
    mocks.$router.resolve.mockReturnValue(
      mock<RouteLocationResolved>({ meta: { authContext: 'user' } })
    )
    await flushPromises()

    expect(getGuestLinkTargetRoute).toHaveBeenCalledWith(
      expect.objectContaining({ permissionId: 'permission-id' })
    )
    expect(mocks.$router.replace).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'files-guest-link' })
    )
    expect(mocks.$router.replace).not.toHaveBeenCalledWith(
      expect.objectContaining({ path: '/files/spaces/personal' })
    )
  })

  it('resumes a session that could not be restored without renewing', async () => {
    getWrapper({ query: { resume: 'true' } })
    await flushPromises()

    expect(authService.resumeGuestSession).toHaveBeenCalledWith('permission-id')
    expect(authService.renewGuestLink).not.toHaveBeenCalled()
  })

  it('renews the link when the session to resume is invalid', async () => {
    const { wrapper } = getWrapper({
      query: { resume: 'true' },
      resumeError: sessionExpiredError(),
      withPin: false
    })
    await flushPromises()

    expect(authService.renewGuestLink).toHaveBeenCalledWith('permission-id')
    expect(wrapper.text()).toContain('Check your inbox')
    expect(wrapper.find(selectors.pinInput).exists()).toBeFalsy()
  })

  it('offers a retry when a session that could not be restored fails again', async () => {
    const { wrapper } = getWrapper({
      query: { resume: 'true' },
      resumeError: guestLinkError('serviceUnavailable')
    })
    await flushPromises()

    expect(authService.renewGuestLink).not.toHaveBeenCalled()
    expect(wrapper.find(selectors.retryButton).exists()).toBeTruthy()
  })

  it('renews the link when the persisted session is invalid', async () => {
    const { wrapper } = getWrapper({
      hasGuestSession: true,
      resumeError: sessionExpiredError(),
      withPin: false
    })
    await flushPromises()

    expect(authService.renewGuestLink).toHaveBeenCalledWith('permission-id')
    expect(wrapper.text()).toContain('Check your inbox')
    expect(wrapper.find(selectors.pinInput).exists()).toBeFalsy()
  })

  it('shows the renewal once another tab renewed the link', async () => {
    const { wrapper, setPendingRenewal } = getWrapper({
      renewError: guestLinkError('tokenInvalid')
    })
    await flushPromises()
    expect(wrapper.find(selectors.errorMessage).exists()).toBeTruthy()

    setPendingRenewal({ withPin: true })
    window.dispatchEvent(new StorageEvent('storage'))
    await flushPromises()

    expect(wrapper.find(selectors.errorMessage).exists()).toBeFalsy()
    expect(wrapper.text()).toContain('Check your inbox')
    expect(wrapper.find(selectors.pinInput).exists()).toBeTruthy()
  })
})

function sessionExpiredError() {
  return new AxiosError('401', '401', undefined, undefined, {
    status: 401,
    data: { error_type: 'session_expired' }
  } as AxiosResponse)
}

function guestSession(): GuestSession {
  return {
    permissionId: 'permission-id',
    space: mockDeep<ShareSpaceResource>({
      id: 'share-id',
      name: 'Invited folder',
      driveAlias: 'share/Invited folder'
    })
  }
}

function guestLinkError(errorType: string, retryAfter?: number) {
  return new AxiosError(errorType, undefined, undefined, undefined, {
    data: { errorType, message: errorType, permissionId: 'permission-id', retryAfter }
  } as AxiosResponse)
}

function getWrapper({
  renewError = null,
  pinError = null,
  resumeError = null,
  pendingRenewal = undefined,
  withPin = true,
  hasGuestSession = false,
  query = {}
}: {
  renewError?: Error
  pinError?: Error
  resumeError?: Error
  pendingRenewal?: GuestLinkRenewal
  withPin?: boolean
  hasGuestSession?: boolean
  query?: Record<string, string>
} = {}) {
  let storedRenewal = pendingRenewal
  function setPendingRenewal(renewal: GuestLinkRenewal | undefined) {
    storedRenewal = renewal
  }
  vi.mocked(authService.getPendingGuestLinkRenewal).mockImplementation(() => storedRenewal)
  vi.mocked(authService.hasGuestSession).mockReturnValue(hasGuestSession)

  if (resumeError) {
    vi.mocked(authService.resumeGuestSession).mockRejectedValue(resumeError)
  } else {
    vi.mocked(authService.resumeGuestSession).mockResolvedValue(guestSession())
  }

  if (renewError) {
    vi.mocked(authService.renewGuestLink).mockRejectedValue(renewError)
  } else {
    vi.mocked(authService.renewGuestLink).mockImplementation(() => {
      if (withPin) {
        setPendingRenewal({ withPin })
      }
      return Promise.resolve({ withPin })
    })
  }

  if (pinError) {
    vi.mocked(authService.verifyGuestLinkPin).mockRejectedValue(pinError)
  } else {
    vi.mocked(authService.verifyGuestLinkPin).mockImplementation(() => {
      setPendingRenewal(undefined)
      return Promise.resolve()
    })
  }

  vi.mocked(useRouteParam).mockReturnValue(ref('permission-id'))
  vi.mocked(useRouteQuery).mockImplementation((name: string) => ref(query[name]))

  const mocks = defaultComponentMocks()

  return {
    mocks,
    setPendingRenewal,
    wrapper: mount(RenewGuestLink, {
      global: {
        plugins: [...defaultPlugins()],
        mocks,
        provide: mocks
      }
    })
  }
}
