import { ref } from 'vue'
import { AxiosError, AxiosResponse } from 'axios'
import { mock, mockDeep } from 'vitest-mock-extended'
import { enableAutoUnmount, flushPromises } from '@vue/test-utils'
import { useRouteParam, useRouteQuery } from '@opencloud-eu/web-pkg'
import { ShareSpaceResource } from '@opencloud-eu/web-client'
import { RouteLocationResolved } from 'vue-router'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import RenewGuestLink from '../../../src/pages/renewGuestLink.vue'
import { authService } from '../../../src/services/auth'
import {
  GuestLinkTokenMissingError,
  GuestSession
} from '../../../src/services/auth/guestSessionManager'

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

  it('asks to check the inbox and shows the pin form after renewing', async () => {
    const { wrapper } = getWrapper()
    await flushPromises()

    expect(wrapper.text()).toContain('Check your inbox')
    expect(wrapper.find(selectors.pinInput).exists()).toBeTruthy()
  })

  it('shows the pin form without renewing again while a renewal is pending', async () => {
    const { wrapper } = getWrapper({ isRenewalPending: true })
    await flushPromises()

    expect(authService.isGuestLinkRenewalPending).toHaveBeenCalledWith('permission-id')
    expect(authService.renewGuestLink).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Check your inbox')
    expect(wrapper.find(selectors.pinInput).exists()).toBeTruthy()
  })

  it.each([
    ['shareExpired', 'Your access to the shared item has expired.'],
    ['shareNotFound', 'The shared item is no longer available.']
  ])('asks to contact the inviter for %s', async (errorType, message) => {
    const { wrapper } = getWrapper({ renewError: guestLinkError(errorType) })
    await flushPromises()

    expect(wrapper.find(selectors.errorMessage).text()).toEqual(message)
    expect(wrapper.text()).toContain('Ask the person who invited you for a new invitation.')
    expect(wrapper.find(selectors.retryButton).exists()).toBeFalsy()
    expect(wrapper.find(selectors.pinInput).exists()).toBeFalsy()
  })

  it.each([
    [
      'sessionInvalid',
      'A new invitation could not be requested. Open the invitation link from your most recent email instead.'
    ],
    [
      'tokenInvalid',
      'A new invitation could not be requested. Open the invitation link from your most recent email instead.'
    ]
  ])('points to the most recent email for %s', async (errorType, message) => {
    const { wrapper } = getWrapper({ renewError: guestLinkError(errorType) })
    await flushPromises()

    expect(wrapper.find(selectors.errorMessage).text()).toEqual(message)
    expect(wrapper.text()).not.toContain('Ask the person who invited you')
    expect(wrapper.find(selectors.retryButton).exists()).toBeFalsy()
    expect(wrapper.find(selectors.pinInput).exists()).toBeFalsy()
  })

  it('points to the most recent email without an error when there is no link token', async () => {
    const { wrapper } = getWrapper({ renewError: new GuestLinkTokenMissingError() })
    await flushPromises()

    expect(wrapper.text()).toContain('Your access has expired')
    expect(wrapper.text()).toContain(
      'Open the invitation link from your most recent email to continue.'
    )
    expect(wrapper.find(selectors.errorMessage).exists()).toBeFalsy()
    expect(wrapper.find(selectors.spinner).exists()).toBeFalsy()
    expect(wrapper.find(selectors.pinInput).exists()).toBeFalsy()
  })

  it('shows the pin form when another tab renewed the link meanwhile', async () => {
    const { wrapper } = getWrapper({ renewError: guestLinkError('tokenInvalid') })
    // the mount already checked for a pending renewal
    vi.mocked(authService.isGuestLinkRenewalPending).mockReturnValue(true)
    await flushPromises()

    expect(wrapper.find(selectors.errorMessage).exists()).toBeFalsy()
    expect(wrapper.find(selectors.pinInput).exists()).toBeTruthy()
  })

  it.each([
    ['an internal server error', guestLinkError('internalError')],
    ['an unavailable service', guestLinkError('serviceUnavailable')],
    ['an unexpected error', new Error('network')]
  ])('offers a retry on %s', async (_, renewError) => {
    const { wrapper } = getWrapper({ renewError })
    await flushPromises()

    expect(wrapper.find(selectors.errorMessage).text()).toEqual(
      'A new invitation could not be requested. Please try again later.'
    )

    vi.mocked(authService.renewGuestLink).mockResolvedValue(undefined)
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
    ['shareExpired', 'Your access to the shared item has expired.'],
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
    const { wrapper } = getWrapper({ resumeError: sessionExpiredError() })
    await flushPromises()
    vi.mocked(authService.renewGuestLink).mockRejectedValue(new GuestLinkTokenMissingError())

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
      resumeError: sessionExpiredError()
    })
    await flushPromises()

    expect(authService.renewGuestLink).toHaveBeenCalledWith('permission-id')
    expect(wrapper.find(selectors.pinInput).exists()).toBeTruthy()
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
      resumeError: sessionExpiredError()
    })
    await flushPromises()

    expect(authService.renewGuestLink).toHaveBeenCalledWith('permission-id')
    expect(wrapper.find(selectors.pinInput).exists()).toBeTruthy()
  })

  it('shows the pin form once another tab renewed the link', async () => {
    const { wrapper } = getWrapper({ renewError: guestLinkError('tokenInvalid') })
    await flushPromises()
    expect(wrapper.find(selectors.errorMessage).exists()).toBeTruthy()

    vi.mocked(authService.isGuestLinkRenewalPending).mockReturnValue(true)
    window.dispatchEvent(new StorageEvent('storage'))
    await flushPromises()

    expect(wrapper.find(selectors.errorMessage).exists()).toBeFalsy()
    expect(wrapper.find(selectors.pinInput).exists()).toBeTruthy()
  })

  it('shows the pin form once another tab renewed the link while the token was missing', async () => {
    const { wrapper } = getWrapper({ renewError: new GuestLinkTokenMissingError() })
    await flushPromises()

    vi.mocked(authService.isGuestLinkRenewalPending).mockReturnValue(true)
    window.dispatchEvent(new StorageEvent('storage'))
    await flushPromises()

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

function guestLinkError(errorType: string) {
  return new AxiosError(errorType, undefined, undefined, undefined, {
    data: { errorType, message: errorType, permissionId: 'permission-id' }
  } as AxiosResponse)
}

function getWrapper({
  renewError = null,
  pinError = null,
  resumeError = null,
  isRenewalPending = false,
  hasGuestSession = false,
  query = {}
}: {
  renewError?: Error
  pinError?: Error
  resumeError?: Error
  isRenewalPending?: boolean
  hasGuestSession?: boolean
  query?: Record<string, string>
} = {}) {
  vi.mocked(authService.isGuestLinkRenewalPending).mockReturnValue(isRenewalPending)
  vi.mocked(authService.hasGuestSession).mockReturnValue(hasGuestSession)

  if (resumeError) {
    vi.mocked(authService.resumeGuestSession).mockRejectedValue(resumeError)
  } else {
    vi.mocked(authService.resumeGuestSession).mockResolvedValue(guestSession())
  }

  if (renewError) {
    vi.mocked(authService.renewGuestLink).mockRejectedValue(renewError)
  } else {
    vi.mocked(authService.renewGuestLink).mockResolvedValue(undefined)
  }

  if (pinError) {
    vi.mocked(authService.verifyGuestLinkPin).mockRejectedValue(pinError)
  } else {
    vi.mocked(authService.verifyGuestLinkPin).mockResolvedValue(undefined)
  }

  vi.mocked(useRouteParam).mockReturnValue(ref('permission-id'))
  vi.mocked(useRouteQuery).mockImplementation((name: string) => ref(query[name]))

  const mocks = defaultComponentMocks()

  return {
    mocks,
    wrapper: mount(RenewGuestLink, {
      global: {
        plugins: [...defaultPlugins()],
        mocks,
        provide: mocks
      }
    })
  }
}
