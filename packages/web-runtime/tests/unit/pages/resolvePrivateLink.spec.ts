import resolvePrivateLink from '../../../src/pages/resolvePrivateLink.vue'
import { defaultPlugins, defaultComponentMocks, shallowMount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { getSharedDriveItem, queryItemAsString, useGetResourceContext } from '@opencloud-eu/web-pkg'
import { HttpError, Resource, SHARE_JAIL_ID, SpaceResource } from '@opencloud-eu/web-client'
import { flushPromises } from '@vue/test-utils'
import { RouteLocationNormalizedLoaded } from 'vue-router'
import { authService } from '../../../src/services/auth'
import { isGuestSessionInvalidError } from '../../../src/services/auth/guestSessionManager'

vi.mock('../../../src/services/auth')
vi.mock('../../../src/services/auth/guestSessionManager', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  isGuestSessionInvalidError: vi.fn(() => false)
}))

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useRouteQuery: vi.fn((str) => str),
  useRouteParam: vi.fn((str) => str),
  queryItemAsString: vi.fn(),
  useGetResourceContext: vi.fn(),
  getSharedDriveItem: vi.fn()
}))

const selectors = {
  loadingSpinner: '[data-testid="loading-spinner"]',
  errorMessage: '[data-testid="error-message"]',
  loginButton: '[data-testid="login-button"]'
}

const buildResource = (attrs: Partial<Resource> = {}) =>
  ({
    isFolder: false,
    type: 'file',
    canDownload: () => false,
    canBeDeleted: () => false,
    canRestore: () => false,
    ...attrs
  }) as Resource

describe('resolvePrivateLink', () => {
  beforeEach(() => {
    // resolving an empty path is an expected failure in several cases below
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('is in a loading state initially', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find(selectors.loadingSpinner).exists()).toBeTruthy()
  })
  it('resolves to "files-spaces-generic" and passes the scrollTo query', async () => {
    const fileId = '1'
    const driveAliasAndItem = 'personal/home'
    const space = mock<SpaceResource>({ getDriveAliasAndItem: () => driveAliasAndItem })
    const resource = buildResource({ fileId })
    const { mocks } = getWrapper({ space, resource, fileId, path: '/' })
    await flushPromises()
    expect(mocks.$router.push).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'files-spaces-generic',
        params: expect.objectContaining({ driveAliasAndItem }),
        query: expect.objectContaining({ scrollTo: fileId })
      })
    )
  })
  describe('resolves to "files-shares-with-me"', () => {
    it('resolves for single file shares', async () => {
      const fileId = '1'
      const driveAliasAndItem = 'shares/someShare'
      const space = mock<SpaceResource>({
        driveType: 'share',
        getDriveAliasAndItem: () => driveAliasAndItem
      })
      const resource = buildResource({ fileId })
      const { mocks } = getWrapper({ space, resource, fileId, path: '/' })
      await flushPromises()
      expect(mocks.$router.push).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'files-shares-with-me' })
      )
    })
    it.each([
      `${SHARE_JAIL_ID}$${SHARE_JAIL_ID}`,
      `${SHARE_JAIL_ID}$${SHARE_JAIL_ID}!${SHARE_JAIL_ID}`
    ])('resolves for the share jail id', async (fileId) => {
      const { mocks } = getWrapper({ fileId })
      await flushPromises()
      expect(mocks.$router.push).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'files-shares-with-me' })
      )
    })
    it('adds the hidden share param for hidden shares', async () => {
      const fileId = '1'
      const driveAliasAndItem = 'shares/someShare'
      const space = mock<SpaceResource>({
        driveType: 'share',
        getDriveAliasAndItem: () => driveAliasAndItem
      })
      const resource = buildResource({ fileId, id: fileId })
      const { mocks } = getWrapper({
        space,
        resource,
        fileId,
        path: '/',
        hiddenShare: true
      })
      await flushPromises()
      expect(mocks.$router.push).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({ 'q_share-visibility': 'hidden' })
        })
      )
    })
  })
  it('resolves into the guest share without looking up the share visibility', async () => {
    const fileId = '1'
    const space = mock<SpaceResource>({
      driveType: 'share',
      getDriveAliasAndItem: () => 'share/Invited folder'
    })
    const resource = buildResource({ fileId, isFolder: true, type: 'folder' })
    const { mocks } = getWrapper({ space, resource, fileId, path: '/', isGuest: true })
    await flushPromises()
    expect(getSharedDriveItem).not.toHaveBeenCalled()
    expect(mocks.$router.push).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'files-guest-link' })
    )
  })
  describe('in a guest context', () => {
    it('does not resolve the share jail id to "files-shares-with-me"', async () => {
      const { mocks } = getWrapper({ fileId: `${SHARE_JAIL_ID}$${SHARE_JAIL_ID}`, isGuest: true })
      await flushPromises()
      expect(mocks.$router.push).not.toHaveBeenCalledWith(
        expect.objectContaining({ name: 'files-shares-with-me' })
      )
    })
    it.each([403, 404])(
      'shows an error message with a login action if the guest has no access (%s)',
      async (statusCode) => {
        const { wrapper, mocks } = getWrapper({
          isGuest: true,
          resolveError: new HttpError('denied', undefined, statusCode)
        })
        await flushPromises()
        expect(mocks.$router.push).not.toHaveBeenCalled()
        expect(wrapper.find(selectors.errorMessage).exists()).toBeTruthy()

        await wrapper.find(selectors.loginButton).trigger('click')
        expect(mocks.$router.push).toHaveBeenCalledWith({
          path: '/login',
          query: { redirectUrl: '/f/1' }
        })
      }
    )
    it.each([new HttpError('server error', undefined, 500), new Error('network error')])(
      'shows an error message without a login action for other errors',
      async (resolveError) => {
        const { wrapper } = getWrapper({ isGuest: true, resolveError })
        await flushPromises()
        expect(wrapper.find(selectors.errorMessage).exists()).toBeTruthy()
        expect(wrapper.find(selectors.loginButton).exists()).toBeFalsy()
      }
    )
    it('handles an invalid guest session as auth error', async () => {
      const error = new Error('unauthorized')
      vi.mocked(isGuestSessionInvalidError).mockReturnValueOnce(true)
      const { wrapper, mocks } = getWrapper({ isGuest: true, resolveError: error })
      await flushPromises()
      expect(authService.handleAuthError).toHaveBeenCalledWith(
        mocks.$router.currentRoute.value,
        error
      )
      expect(wrapper.find(selectors.errorMessage).exists()).toBeFalsy()
    })
  })
  it('passes the details query param if given via query', async () => {
    const details = 'sharing'
    const { mocks } = getWrapper({ details, path: '/' })
    await flushPromises()
    expect(mocks.$router.push).toHaveBeenCalledWith(
      expect.objectContaining({ query: expect.objectContaining({ details }) })
    )
  })
  it('shows an error message if the path is empty', async () => {
    const { wrapper } = getWrapper()
    await flushPromises()

    expect(wrapper.find(selectors.errorMessage).exists()).toBeTruthy()
  })
})

function getWrapper({
  space = mock<SpaceResource>(),
  resource = buildResource(),
  path = '',
  fileId = '',
  details = '',
  hiddenShare = false,
  openWithDefaultAppQuery = 'true',
  isGuest = false,
  resolveError = undefined
}: {
  space?: SpaceResource
  resource?: Resource
  path?: string
  fileId?: string
  details?: string
  hiddenShare?: boolean
  openWithDefaultAppQuery?: string
  isGuest?: boolean
  resolveError?: Error
} = {}) {
  vi.mocked(queryItemAsString).mockImplementation((str) => {
    if (str === 'fileId') {
      return fileId
    }
    if (str === 'openWithDefaultApp') {
      return openWithDefaultAppQuery
    }
    if (str === 'details') {
      return details
    }
    return str.toString()
  })

  vi.mocked(useGetResourceContext).mockReturnValue({
    getResourceContext: resolveError
      ? vi.fn().mockRejectedValue(resolveError)
      : vi.fn().mockResolvedValue({ space, resource, path })
  })

  vi.mocked(getSharedDriveItem).mockResolvedValue({ '@UI.Hidden': hiddenShare })

  const mocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocationNormalizedLoaded>({
        name: 'resolvePrivateLink',
        path: '/f/1',
        fullPath: '/f/1'
      })
    })
  }

  return {
    mocks,
    wrapper: shallowMount(resolvePrivateLink, {
      global: {
        plugins: [
          ...defaultPlugins({ piniaOptions: { authState: { guestContextReady: isGuest } } })
        ],
        mocks,
        provide: mocks,
        stubs: {
          OcCard: false,
          OcButton: false
        }
      }
    })
  }
}
