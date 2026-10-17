import DriveRedirect from '../../../../src/views/spaces/DriveRedirect.vue'
import { mock } from 'vitest-mock-extended'
import {
  defaultPlugins,
  mount,
  defaultComponentMocks,
  defaultStubs,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'

describe('DriveRedirect view', () => {
  it('redirects to "projects" route if no personal space exist', () => {
    const { mocks } = getMountedWrapper()
    expect(mocks.$router.replace).toHaveBeenCalledWith({
      name: 'files-spaces-projects'
    })
  })

  it('redirects guests to their shares', () => {
    const { mocks } = getMountedWrapper({ isGuest: true })
    expect(mocks.$router.replace).toHaveBeenCalledWith({ name: 'files-guest-shares' })
  })
})

function getMountedWrapper({
  currentRouteName = 'files-spaces-generic',
  isGuest = false
}: { currentRouteName?: string; isGuest?: boolean } = {}) {
  const plugins = defaultPlugins({
    piniaOptions: { ...(isGuest && { authState: { guestContextReady: true } }) }
  })

  const mocks = {
    ...defaultComponentMocks({ currentRoute: mock<RouteLocation>({ name: currentRouteName }) })
  }

  return {
    mocks,
    wrapper: mount(DriveRedirect, {
      global: {
        plugins,
        stubs: defaultStubs,
        mocks,
        provide: mocks
      }
    })
  }
}
