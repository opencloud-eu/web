import { ref } from 'vue'
import { useRouteQuery } from '@opencloud-eu/web-pkg'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import Logout from '../../../src/pages/logout.vue'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useRouteQuery: vi.fn()
}))

const selectors = {
  logInAgainButton: '#exitAnchor'
}

describe('logout page', () => {
  it('offers to log in again after a user logout', () => {
    const { wrapper } = getWrapper()

    expect(wrapper.find(selectors.logInAgainButton).exists()).toBeTruthy()
    expect(wrapper.text()).not.toContain('link you received by email')
  })

  it('points a guest to the link from the email instead of the login', () => {
    const { wrapper } = getWrapper({ guest: 'true' })

    expect(wrapper.find(selectors.logInAgainButton).exists()).toBeFalsy()
    expect(wrapper.text()).toContain('link you received by email')
  })

  it('tells a guest how to end the session if the logout failed', () => {
    const { wrapper } = getWrapper({ guest: 'true', failed: 'true' })

    expect(wrapper.text()).toContain('Logout failed')
    expect(wrapper.text()).toContain('clear the cookies of this site')
    expect(wrapper.text()).not.toContain('logged out successfully')
  })
})

function getWrapper(query: Record<string, string> = {}) {
  vi.mocked(useRouteQuery).mockImplementation((name: string) => ref(query[name]))
  const mocks = defaultComponentMocks()

  return {
    mocks,
    wrapper: mount(Logout, {
      global: {
        plugins: [...defaultPlugins()],
        mocks,
        provide: mocks
      }
    })
  }
}
