import DriveRedirect from '../../../../src/views/spaces/DriveRedirect.vue'
import { mock } from 'vitest-mock-extended'
import { join } from 'path'
import { computed, unref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { Router } from 'vue-router'
import type { MockInstance } from 'vitest'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { eventBus } from '@opencloud-eu/web-pkg'
import {
  createRouter,
  defaultPlugins,
  mount,
  defaultComponentMocks,
  defaultStubs,
  RouteLocation,
  writable
} from '@opencloud-eu/web-test-helpers'

function publishedTitles(publishSpy: MockInstance) {
  return publishSpy.mock.calls
    .filter(([topic]) => topic === 'runtime.documentTitle.changed')
    .map(([, payload]) => payload.shortDocumentTitle)
}

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

  it('leaves the title to the view it redirects to', () => {
    const publishSpy = vi.spyOn(eventBus, 'publish')
    getMountedWrapper({ driveAliasAndItem: 'personal/home', spaces: [getPersonalSpace()] })
    expect(publishedTitles(publishSpy)).toEqual([])
  })

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

  it('keeps a folder with a hash in its name of the static personal drive alias', async () => {
    const router = createRouter({
      routes: [
        {
          name: 'files-spaces-generic',
          path: '/files/spaces/:driveAliasAndItem(.*)?',
          component: {}
        }
      ]
    })
    await router.push('/files/spaces/personal/home/Doc%23A')
    getMountedWrapper({
      driveAliasAndItem: 'personal/home/Doc#A',
      spaces: [getPersonalSpace()],
      router
    })
    await flushPromises()

    const { params } = router.resolve(unref(router.currentRoute).fullPath)
    expect(params.driveAliasAndItem).toBe('personal/admin/Doc#A')
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

    it('titles the page as not found', async () => {
      const publishSpy = vi.spyOn(eventBus, 'publish')
      const { mocks, wrapper } = getMountedWrapper({
        driveAliasAndItem: 'project/unknown',
        spaces: [getPersonalSpace()]
      })
      expect(publishedTitles(publishSpy)).toEqual(['Resource not found'])

      setRoute(mocks, 'personal')
      await wrapper.setProps({ driveAliasAndItem: 'personal' })
      expect(publishedTitles(publishSpy)).toEqual(['Resource not found'])
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
  spaces = [],
  router
}: {
  currentRouteName?: string
  driveAliasAndItem?: string
  isGuest?: boolean
  spaces?: SpaceResource[]
  router?: Router
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
  if (router) {
    mocks.$router = router as typeof mocks.$router
  }

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
