import DriveRedirect from '../../../../src/views/spaces/DriveRedirect.vue'
import { mock } from 'vitest-mock-extended'
import { ShareSpaceResource } from '@opencloud-eu/web-client'
import { useSpacesStore } from '@opencloud-eu/web-pkg'
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

  it('redirects guests to the root of their share', () => {
    const space = mock<ShareSpaceResource>({ id: 'share-id', driveType: 'share' })
    space.getDriveAliasAndItem.mockReturnValue('share/Invited folder')
    const { mocks } = getMountedWrapper({ guestSpace: space })
    expect(mocks.$router.replace).toHaveBeenCalledWith({
      name: 'files-guest-link',
      params: { driveAliasAndItem: 'share/Invited folder' },
      query: { shareId: 'share-id' }
    })
  })

  it('resumes the guest session if the guest space is missing', () => {
    const { mocks } = getMountedWrapper({ isGuest: true })
    expect(mocks.$router.replace).toHaveBeenCalledWith({
      name: 'renewGuestLink',
      params: { permissionId: 'permission-id' },
      query: { resume: 'true' }
    })
  })
})

function getMountedWrapper({
  currentRouteName = 'files-spaces-generic',
  guestSpace = undefined,
  isGuest = !!guestSpace
}: { currentRouteName?: string; guestSpace?: ShareSpaceResource; isGuest?: boolean } = {}) {
  const plugins = defaultPlugins({
    piniaOptions: {
      ...(isGuest && {
        authState: {
          guestContextReady: true,
          guestSpaceId: guestSpace?.id,
          guestPermissionId: 'permission-id'
        }
      })
    }
  })
  vi.mocked(useSpacesStore().getSpace).mockReturnValue(guestSpace)

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
