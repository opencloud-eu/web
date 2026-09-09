import { ref } from 'vue'
import { mockDeep } from 'vitest-mock-extended'
import { flushPromises } from '@vue/test-utils'
import { ClientService, GuestSession, useRouteParam } from '@opencloud-eu/web-pkg'
import { Resource, ShareSpaceResource } from '@opencloud-eu/web-client'
import { defaultComponentMocks, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import ResolveGuestLink from '../../../src/pages/resolveGuestLink.vue'
import { authService } from '../../../src/services/auth'
import { GuestAuthError } from '../../../src/services/auth/guestAuth'

vi.mock('../../../src/services/auth')

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useRouteParam: vi.fn()
}))

const selectors = {
  spinner: 'oc-spinner-stub',
  errorMessage: '[data-testid="error-message"]'
}

const guestSession: GuestSession = {
  shareId: 'share-id',
  shareName: 'Invited folder',
  permissions: [],
  expiresAt: Date.now() + 1000
}

describe('resolveGuestLink', () => {
  it('shows a spinner while resolving', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find(selectors.spinner).exists()).toBeTruthy()
    expect(wrapper.find(selectors.errorMessage).exists()).toBeFalsy()
  })

  it('exchanges the token from the url path', async () => {
    getWrapper()
    await flushPromises()
    expect(authService.resolveGuestLink).toHaveBeenCalledWith('magic-token')
  })

  it('replaces the route with the invited folder', async () => {
    const { mocks } = getWrapper()
    await flushPromises()

    expect(mocks.$router.replace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'files-spaces-generic',
        params: { driveAliasAndItem: 'share/Invited folder' },
        query: expect.objectContaining({ shareId: 'share-id' })
      })
    )
    // never pushed: the magic token sits in the url path and must not stay in the history
    expect(mocks.$router.push).not.toHaveBeenCalled()
  })

  it('replaces the route with the default app for a single file invite', async () => {
    const { mocks } = getWrapper({ isFolder: false })
    await flushPromises()

    expect(mocks.$router.replace).toHaveBeenCalled()
    expect(mocks.$router.replace.mock.calls[0][0]).not.toMatchObject({
      name: 'files-spaces-generic'
    })
  })

  it('routes to the expired page when the token is spent', async () => {
    const { mocks } = getWrapper({
      resolveError: new GuestAuthError({ errorType: 'token_expired', shareId: 'share-id' })
    })
    await flushPromises()

    expect(mocks.$router.replace).toHaveBeenCalledWith({ name: 'guestSessionExpired' })
  })

  it('shows a generic error for an invalid link and grants no session', async () => {
    const { wrapper, mocks } = getWrapper({
      resolveError: new GuestAuthError({ statusCode: 404 })
    })
    await flushPromises()

    expect(wrapper.find(selectors.errorMessage).text()).toEqual(
      'This invitation link is invalid or has expired.'
    )
    expect(mocks.$router.replace).not.toHaveBeenCalled()
  })

  it('does not render anything derived from the invitation before it resolved', async () => {
    const { wrapper } = getWrapper({
      resolveError: new GuestAuthError({ statusCode: 404 })
    })
    await flushPromises()

    const html = wrapper.html()
    expect(html).not.toContain('magic-token')
    expect(html).not.toContain('share-id')
    expect(html).not.toContain('Invited folder')
  })
})

function getWrapper({
  isFolder = true,
  resolveError = null
}: { isFolder?: boolean; resolveError?: Error } = {}) {
  const $clientService = mockDeep<ClientService>()
  const space = mockDeep<ShareSpaceResource>({
    id: 'share-id',
    driveType: 'share',
    driveAlias: 'share/Invited folder',
    getDriveAliasAndItem: () => 'share/Invited folder'
  })

  $clientService.webdav.getFileInfo.mockResolvedValue(
    mockDeep<Resource>({ id: 'resource-id', isFolder, path: '/' })
  )

  if (resolveError) {
    vi.mocked(authService.resolveGuestLink).mockRejectedValue(resolveError)
  } else {
    vi.mocked(authService.resolveGuestLink).mockResolvedValue(guestSession)
  }

  vi.mocked(useRouteParam).mockReturnValue(ref('magic-token'))

  const mocks = { ...defaultComponentMocks(), $clientService }

  return {
    mocks,
    wrapper: shallowMount(ResolveGuestLink, {
      global: {
        // the share space is normally created by the guest session manager, which is mocked here
        plugins: [
          ...defaultPlugins({
            piniaOptions: { stubActions: false, spacesState: { spaces: [space] } }
          })
        ],
        mocks,
        provide: mocks,
        stubs: { OcCard: false, PlainCard: false }
      }
    })
  }
}
