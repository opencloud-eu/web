import DriveRedirect from '../../../../src/views/spaces/DriveRedirect.vue'
import { mock } from 'vitest-mock-extended'
import { join } from 'path'
import { computed } from 'vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import {
  defaultPlugins,
  mount,
  defaultComponentMocks,
  defaultStubs,
  RouteLocation,
  writable
} from '@opencloud-eu/web-test-helpers'

const selectors = {
  notFoundMessage: '#files-list-not-found-message',
  goToSpacesButton: '#space-not-found-button-go-spaces'
}

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

  it('redirects guests to their shares for a project space link', () => {
    const { mocks, wrapper } = getMountedWrapper({
      isGuest: true,
      driveAliasAndItem: 'project/unknown'
    })
    expect(mocks.$router.replace).toHaveBeenCalledWith({ name: 'files-guest-shares' })
    expect(wrapper.find(selectors.notFoundMessage).exists()).toBeFalsy()
  })

  it.each(['', 'personal/home'])(
    'redirects the drive alias "%s" to the personal space',
    (driveAliasAndItem) => {
      const { mocks, wrapper } = getMountedWrapper({
        driveAliasAndItem,
        spaces: [getPersonalSpace()]
      })
      expect(mocks.$router.replace).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ driveAliasAndItem: 'personal/admin' })
        })
      )
      expect(mocks.$router.replace).toHaveBeenCalledTimes(1)
      expect(wrapper.find(selectors.notFoundMessage).exists()).toBeFalsy()
    }
  )

  it('keeps the item path of the static personal drive alias', () => {
    const { mocks } = getMountedWrapper({
      driveAliasAndItem: 'personal/home/folder/file.txt',
      spaces: [getPersonalSpace()]
    })
    expect(mocks.$router.replace).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ driveAliasAndItem: 'personal/admin/folder/file.txt' })
      })
    )
  })

  describe('unknown project space', () => {
    it('shows a not found message with a link to the spaces overview', () => {
      const { mocks, wrapper } = getMountedWrapper({
        driveAliasAndItem: 'project/unknown/folder',
        spaces: [getPersonalSpace()]
      })
      expect(mocks.$router.replace).not.toHaveBeenCalled()
      expect(wrapper.find(selectors.notFoundMessage).exists()).toBeTruthy()
      expect(wrapper.find(selectors.goToSpacesButton).exists()).toBeTruthy()
    })

    it('redirects when navigating from the not found message to the personal space', async () => {
      const { mocks, wrapper } = getMountedWrapper({
        driveAliasAndItem: 'project/unknown',
        spaces: [getPersonalSpace()]
      })
      expect(mocks.$router.replace).not.toHaveBeenCalled()

      setRoute(mocks, 'personal')
      await wrapper.setProps({ driveAliasAndItem: 'personal' })

      expect(mocks.$router.replace).toHaveBeenCalledTimes(1)
      expect(mocks.$router.replace).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ driveAliasAndItem: 'personal/admin' })
        })
      )
      expect(wrapper.find(selectors.notFoundMessage).exists()).toBeFalsy()
    })

    it('keeps the not found message when navigating to another unknown project space', async () => {
      const { mocks, wrapper } = getMountedWrapper({
        driveAliasAndItem: 'project/unknown',
        spaces: [getPersonalSpace()]
      })

      setRoute(mocks, 'project/other-unknown')
      await wrapper.setProps({ driveAliasAndItem: 'project/other-unknown' })

      expect(mocks.$router.replace).not.toHaveBeenCalled()
      expect(wrapper.find(selectors.notFoundMessage).exists()).toBeTruthy()
      expect(wrapper.find(selectors.goToSpacesButton).exists()).toBeTruthy()
    })

    it('shows a not found message without a personal space', () => {
      const { mocks, wrapper } = getMountedWrapper({ driveAliasAndItem: 'project/unknown' })
      expect(mocks.$router.replace).not.toHaveBeenCalled()
      expect(wrapper.find(selectors.notFoundMessage).exists()).toBeTruthy()
    })
  })
})

function getPersonalSpace() {
  const space = mock<SpaceResource>({ id: 'personal-1', driveType: 'personal' })
  space.getDriveAliasAndItem.mockImplementation((resource: Resource) =>
    join('personal/admin', resource.path).replace(/\/$/, '')
  )
  return space
}

function getRoute(name: string, driveAliasAndItem: string) {
  return mock<RouteLocation>({
    name,
    params: { driveAliasAndItem },
    fullPath: `/files/spaces/${driveAliasAndItem}`
  })
}

function setRoute(mocks: ReturnType<typeof defaultComponentMocks>, driveAliasAndItem: string) {
  writable(mocks.$router).currentRoute = computed(() =>
    getRoute('files-spaces-generic', driveAliasAndItem)
  )
}

function getMountedWrapper({
  currentRouteName = 'files-spaces-generic',
  driveAliasAndItem = '',
  isGuest = false,
  spaces = []
}: {
  currentRouteName?: string
  driveAliasAndItem?: string
  isGuest?: boolean
  spaces?: SpaceResource[]
} = {}) {
  const plugins = defaultPlugins({
    piniaOptions: {
      ...(isGuest && { authState: { guestContextReady: true } }),
      spacesState: { spaces }
    }
  })

  const mocks = {
    ...defaultComponentMocks({ currentRoute: getRoute(currentRouteName, driveAliasAndItem) })
  }
  mocks.$router.replace.mockResolvedValue(undefined)

  return {
    mocks,
    wrapper: mount(DriveRedirect, {
      props: { driveAliasAndItem },
      global: {
        plugins,
        stubs: defaultStubs,
        mocks,
        provide: mocks
      }
    })
  }
}
