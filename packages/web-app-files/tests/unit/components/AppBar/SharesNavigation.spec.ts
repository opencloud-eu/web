import SharesNavigation from '../../../../src/components/AppBar/SharesNavigation.vue'
import { eventBus, locationSharesWithMe } from '@opencloud-eu/web-pkg'
import { OcButton } from '@opencloud-eu/design-system/components'
import { mock } from 'vitest-mock-extended'
import { RouteRecordNormalized } from 'vue-router'
import {
  defaultPlugins,
  defaultStubs,
  shallowMount,
  defaultComponentMocks,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'

const routes = [
  mock<RouteRecordNormalized>({
    path: '/files/shares/with-me/',
    name: 'files-shares-with-me'
  }),
  mock<RouteRecordNormalized>({
    path: '/files/shares/with-others/',
    name: 'files-shares-with-others'
  }),
  mock<RouteRecordNormalized>({
    path: '/files/shares/via-link/',
    name: 'files-shares-via-link'
  })
]

describe('SharesNavigation component', () => {
  it('renders a shares navigation for both mobile and a desktop viewports', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.html()).toMatchSnapshot()
  })
  describe('navigation items', () => {
    it('renders the active item as a button that reloads the list on click', async () => {
      const publishSpy = vi.spyOn(eventBus, 'publish')
      const { wrapper } = getWrapper()
      const activeItem = wrapper.findAllComponents(OcButton).at(0)
      expect(activeItem.props('type')).toBe('button')
      expect(activeItem.props('to')).toBeUndefined()
      await activeItem.vm.$emit('click')
      expect(publishSpy).toHaveBeenCalledWith('app.files.list.load')
    })
    it('renders inactive items as router links', () => {
      const { wrapper } = getWrapper()
      const inactiveItem = wrapper.findAllComponents(OcButton).at(1)
      expect(inactiveItem.props('type')).toBe('router-link')
      expect(inactiveItem.props('to')).toBe('/files/shares/with-others/')
    })
  })
})

function getWrapper({ currentRouteName = locationSharesWithMe.name } = {}) {
  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({ name: currentRouteName })
  })
  mocks.$router.getRoutes.mockImplementation(() => routes)
  return {
    mocks,
    wrapper: shallowMount(SharesNavigation, {
      global: {
        stubs: defaultStubs,
        renderStubDefaultSlot: true,
        mocks,
        provide: mocks,
        plugins: [...defaultPlugins()]
      }
    })
  }
}
