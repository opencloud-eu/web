import { ref } from 'vue'
import { mockDeep } from 'vitest-mock-extended'
import { flushPromises } from '@vue/test-utils'
import { useRouteParam } from '@opencloud-eu/web-pkg'
import { ShareSpaceResource } from '@opencloud-eu/web-client'
import { defaultComponentMocks, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import ResolveGuestLink from '../../../src/pages/resolveGuestLink.vue'
import { authService } from '../../../src/services/auth'

vi.mock('../../../src/services/auth')

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useRouteParam: vi.fn()
}))

const selectors = {
  spinner: 'oc-spinner-stub',
  errorMessage: '[data-testid="error-message"]'
}

describe('resolveGuestLink', () => {
  it('shows a spinner while resolving', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find(selectors.spinner).exists()).toBeTruthy()
    expect(wrapper.find(selectors.errorMessage).exists()).toBeFalsy()
  })

  it('redeems the token from the url path', async () => {
    getWrapper()
    await flushPromises()
    expect(authService.redeemGuestLink).toHaveBeenCalledWith('magic-token')
  })

  it('replaces the route with the guest link page of the shared drive', async () => {
    const { mocks } = getWrapper()
    await flushPromises()

    expect(mocks.$router.replace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'files-guest-link',
        params: { driveAlias: 'share/Invited folder' }
      })
    )
    expect(mocks.$router.push).not.toHaveBeenCalled()
  })

  it('shows a generic error when the redemption fails', async () => {
    const { wrapper, mocks } = getWrapper({ redeemError: new Error('401') })
    await flushPromises()

    expect(wrapper.find(selectors.errorMessage).text()).toEqual(
      'This invitation link is invalid or has expired.'
    )
    expect(mocks.$router.replace).not.toHaveBeenCalled()
  })

  it('does not render the token after a failed redemption', async () => {
    const { wrapper } = getWrapper({ redeemError: new Error('401') })
    await flushPromises()

    expect(wrapper.html()).not.toContain('magic-token')
  })
})

function getWrapper({ redeemError = null }: { redeemError?: Error } = {}) {
  const space = mockDeep<ShareSpaceResource>({
    id: 'share-id',
    driveType: 'share',
    driveAlias: 'share/Invited folder'
  })

  if (redeemError) {
    vi.mocked(authService.redeemGuestLink).mockRejectedValue(redeemError)
  } else {
    vi.mocked(authService.redeemGuestLink).mockResolvedValue(space)
  }

  vi.mocked(useRouteParam).mockReturnValue(ref('magic-token'))

  const mocks = defaultComponentMocks()

  return {
    mocks,
    wrapper: shallowMount(ResolveGuestLink, {
      global: {
        plugins: [...defaultPlugins()],
        mocks,
        provide: mocks,
        stubs: { OcCard: false, PlainCard: false }
      }
    })
  }
}
