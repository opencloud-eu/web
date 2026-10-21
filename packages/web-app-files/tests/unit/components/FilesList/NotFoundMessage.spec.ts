import NotFoundMessage from '../../../../src/components/FilesList/NotFoundMessage.vue'
import { PublicSpaceResource, SpaceResource, Resource } from '@opencloud-eu/web-client'
import { MockProxy, mock } from 'vitest-mock-extended'
import { join } from 'path'
import { defaultComponentMocks, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { OcButton } from '@opencloud-eu/design-system/components'
import { RouteLocationNamedRaw, RouteLocationNormalizedLoaded } from 'vue-router'

const selectors = {
  homeButton: '#files-list-not-found-button-go-home',
  spacesButton: '#space-not-found-button-go-spaces',
  reloadLinkButton: '#files-list-not-found-button-reload-link',
  guestShareButton: '#files-list-not-found-button-go-guest-share'
}

const spacesLocation = mock<RouteLocationNormalizedLoaded>({ name: 'files-spaces-generic' })
const publicLocation = mock<RouteLocationNormalizedLoaded>({ name: 'files-public-link' })
const guestLocation = mock<RouteLocationNormalizedLoaded>({ name: 'files-guest-link' })

describe('NotFoundMessage', () => {
  describe('when user on personal route', () => {
    let space: MockProxy<SpaceResource>
    beforeEach(() => {
      space = mock<SpaceResource>({
        driveType: 'personal'
      })
    })

    it('should show home button', () => {
      const { wrapper } = getWrapper(space, spacesLocation)
      const homeButton = wrapper.find(selectors.homeButton)

      expect(homeButton.exists()).toBeTruthy()
      expect(homeButton.find('span')).toBeTruthy()
      expect(homeButton.find('span').text()).toBe('Go to »Personal« page')
    })

    it('should not show reload public link button', () => {
      const { wrapper } = getWrapper(space, spacesLocation)
      const reloadLinkButton = wrapper.find(selectors.reloadLinkButton)

      expect(reloadLinkButton.exists()).toBeFalsy()
    })

    it('should have property route to personal space', () => {
      const { wrapper } = getWrapper(space, spacesLocation)
      const homeButton = wrapper.findComponent<typeof OcButton>(selectors.homeButton)

      const routeLocation = homeButton.props('to') as RouteLocationNamedRaw
      expect(routeLocation.name).toBe(spacesLocation.name)
      expect(routeLocation.params.driveAliasAndItem).toBe('personal')
    })
  })

  describe('when user on project space route', () => {
    it('should show the spaces button instead of the home button', () => {
      const space = mock<SpaceResource>({ driveType: 'project' })
      const { wrapper } = getWrapper(space, spacesLocation)

      expect(wrapper.find(selectors.spacesButton).exists()).toBeTruthy()
      expect(wrapper.find(selectors.homeButton).exists()).toBeFalsy()
    })
  })

  describe('without a space on the spaces route', () => {
    it('should show the spaces button for a project space drive alias', () => {
      const { wrapper } = getWrapper(
        null,
        mock<RouteLocationNormalizedLoaded>({
          name: 'files-spaces-generic',
          params: { driveAliasAndItem: 'project/unknown' }
        })
      )

      expect(wrapper.find(selectors.spacesButton).exists()).toBeTruthy()
      expect(wrapper.find(selectors.homeButton).exists()).toBeFalsy()
    })

    it('should show the home button for any other drive alias', () => {
      const { wrapper } = getWrapper(
        null,
        mock<RouteLocationNormalizedLoaded>({
          name: 'files-spaces-generic',
          params: { driveAliasAndItem: 'personal/unknown' }
        })
      )

      expect(wrapper.find(selectors.homeButton).exists()).toBeTruthy()
      expect(wrapper.find(selectors.spacesButton).exists()).toBeFalsy()
    })
  })

  describe('when user on public link route', () => {
    let space: MockProxy<PublicSpaceResource>
    beforeEach(() => {
      space = mock<PublicSpaceResource>({
        driveType: 'public'
      })
      space.getDriveAliasAndItem.mockImplementation((resource) =>
        join('public/1234', resource.path)
      )
    })

    it('should show reload link button', () => {
      const { wrapper } = getWrapper(space, publicLocation)
      const reloadLinkButton = wrapper.find(selectors.reloadLinkButton)

      expect(reloadLinkButton.exists()).toBeTruthy()
      expect(reloadLinkButton.find('span')).toBeTruthy()
      expect(reloadLinkButton.find('span').text()).toBe('Reload public link')
    })

    it('should not show home button', () => {
      const { wrapper } = getWrapper(space, publicLocation)
      const homeButton = wrapper.find(selectors.homeButton)

      expect(homeButton.exists()).toBeFalsy()
    })

    it('should have property route to files public list', () => {
      const { wrapper } = getWrapper(space, publicLocation)
      const reloadLinkButton = wrapper.findComponent<typeof OcButton>(selectors.reloadLinkButton)

      const routeLocation = reloadLinkButton.props('to') as RouteLocationNamedRaw
      expect(routeLocation.name).toBe(publicLocation.name)
      expect(routeLocation.params.driveAliasAndItem).toBe(
        space.getDriveAliasAndItem({ path: '' } as Resource)
      )
    })
  })

  describe('when guest on guest link route', () => {
    it('should have a button routing to the shared item', () => {
      const space = mock<SpaceResource>({ driveType: 'share' })
      space.getDriveAliasAndItem.mockReturnValue('share/Invited folder')
      const { wrapper } = getWrapper(space, guestLocation)
      const guestShareButton = wrapper.findComponent<typeof OcButton>(selectors.guestShareButton)

      const routeLocation = guestShareButton.props('to') as RouteLocationNamedRaw
      expect(guestShareButton.find('span').text()).toBe('Go to the shared item')
      expect(routeLocation.name).toBe(guestLocation.name)
      expect(routeLocation.params.driveAliasAndItem).toBe('share/Invited folder')
    })

    it('should not show the button without a space', () => {
      const { wrapper } = getWrapper(null, guestLocation)
      expect(wrapper.find(selectors.guestShareButton).exists()).toBeFalsy()
    })
  })
})

function getWrapper(space: SpaceResource, route: RouteLocationNormalizedLoaded) {
  const mocks = defaultComponentMocks({ currentRoute: route })
  return {
    wrapper: shallowMount(NotFoundMessage, {
      props: { space },
      global: {
        renderStubDefaultSlot: true,
        stubs: { NoContentMessage: false },
        mocks,
        provide: mocks,
        plugins: [...defaultPlugins()]
      }
    })
  }
}
