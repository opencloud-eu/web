import { mock } from 'vitest-mock-extended'
import {
  PartialComponentProps,
  RouteLocation,
  defaultComponentMocks,
  defaultPlugins,
  shallowMount,
  useGetMatchingSpaceMock
} from '@opencloud-eu/web-test-helpers'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import AppTopBar from '../../../src/components/AppTopBar.vue'
import { Action } from '../../../src/composables/actions'
import { useGetMatchingSpace } from '../../../src/composables/spaces/useGetMatchingSpace'
import ResourceListItem from '../../../src/components/FilesList/ResourceListItem.vue'

vi.mock('../../../src/composables/spaces/useGetMatchingSpace')

describe('AppTopBar', () => {
  describe('if no resource is present', () => {
    it('renders only a close button', () => {
      const { wrapper } = getWrapper({
        props: { resource: mock<Resource>({ path: '/test.txt', remoteItemPath: '/test' }) }
      })
      expect(wrapper.find('#app-top-bar-close').exists()).toBeTruthy()
    })
  })
  describe('if a resource is present', () => {
    it('renders a resource and no actions (if none given) and a close button', () => {
      const { wrapper } = getWrapper({
        props: { resource: mock<Resource>({ path: '/test.txt', remoteItemPath: '/test' }) }
      })
      expect(wrapper.find('resource-list-item-stub').exists()).toBeTruthy()
    })

    it('renders a resource and mainActions (if given) and a close button', () => {
      const { wrapper } = getWrapper({
        props: {
          resource: mock<Resource>({ path: '/test.txt', remoteItemPath: '/test' }),
          mainActions: [mock<Action>()]
        }
      })
      expect(wrapper.find('context-action-menu-stub').exists()).toBeTruthy()
    })

    it('renders a resource and dropdownActions (if given) and a close button', () => {
      const { wrapper } = getWrapper({
        props: {
          resource: mock<Resource>({ path: '/test.txt', remoteItemPath: '/test' }),
          dropDownMenuSections: [mock<Action>()]
        }
      })
      expect(wrapper.find('#oc-openfile-contextmenu-trigger').exists()).toBeTruthy()
    })

    it('renders a resource without file extension if areFileExtensionsShown is set to false', () => {
      const { wrapper } = getWrapper({
        props: {
          resource: mock<Resource>({ path: '/test.txt', remoteItemPath: '/test' }),
          mainActions: [mock<Action>()],
          dropDownMenuSections: [mock<Action>()]
        },
        areFileExtensionsShown: false
      })
      const resourceListItem =
        wrapper.findComponent<typeof ResourceListItem>('resource-list-item-stub')

      expect(resourceListItem.props('isExtensionDisplayed')).toBeFalsy()
    })
    it('renders the autosave indicator for writable editor resources', () => {
      const { wrapper } = getWrapper({
        props: {
          resource: mock<Resource>({ path: '/test.txt' }),
          hasAutoSave: true,
          isEditor: true,
          isReadOnly: false
        }
      })

      expect(wrapper.find('[data-testid="autosave-indicator"]').exists()).toBeTruthy()
    })
  })
})

function getWrapper({
  props = {},
  areFileExtensionsShown = true
}: {
  props?: PartialComponentProps<typeof AppTopBar>
  areFileExtensionsShown?: boolean
} = {}) {
  const mocks = defaultComponentMocks({
    currentRoute: mock<RouteLocation>({ name: 'admin-settings-general' })
  })

  vi.mocked(useGetMatchingSpace).mockImplementation(() =>
    useGetMatchingSpaceMock({
      getInternalSpace: () => mock<SpaceResource>(),
      isResourceAccessible: () => true
    })
  )

  return {
    wrapper: shallowMount(AppTopBar, {
      props,
      global: {
        plugins: [
          ...defaultPlugins({ piniaOptions: { resourcesStore: { areFileExtensionsShown } } })
        ],
        mocks,
        provide: mocks
      }
    })
  }
}
