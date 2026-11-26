import { mock } from 'vitest-mock-extended'
import { nextTick } from 'vue'
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
  })

  describe('saving indicator', () => {
    const indicator = '[data-testid="saving-indicator"]'
    const props = {
      resource: mock<Resource>({ path: '/test.txt' }),
      mainActions: [mock<Action>()]
    }

    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('is not shown while not saving', () => {
      const { wrapper } = getWrapper({ props })

      expect(wrapper.find(indicator).exists()).toBeFalsy()
    })

    it('is shown while saving', async () => {
      const { wrapper } = getWrapper({ props })

      await wrapper.setProps({ isSaving: true })

      expect(wrapper.find(indicator).exists()).toBeTruthy()
      expect(wrapper.findComponent({ name: 'OcHiddenAnnouncer' }).props('announcement')).toBe(
        'Saving…'
      )
    })

    it('stays for its minimum duration after a fast save', async () => {
      const { wrapper } = getWrapper({ props })
      await wrapper.setProps({ isSaving: true })
      vi.advanceTimersByTime(200)

      await wrapper.setProps({ isSaving: false })
      expect(wrapper.find(indicator).exists()).toBeTruthy()

      vi.advanceTimersByTime(799)
      await nextTick()
      expect(wrapper.find(indicator).exists()).toBeTruthy()

      vi.advanceTimersByTime(1)
      await nextTick()
      expect(wrapper.find(indicator).exists()).toBeFalsy()
    })

    it('hides right away after a save that took longer than the minimum duration', async () => {
      const { wrapper } = getWrapper({ props })
      await wrapper.setProps({ isSaving: true })
      vi.advanceTimersByTime(3000)

      await wrapper.setProps({ isSaving: false })

      expect(wrapper.find(indicator).exists()).toBeFalsy()
    })

    it('stays when another save starts during its minimum duration', async () => {
      const { wrapper } = getWrapper({ props })
      await wrapper.setProps({ isSaving: true })
      await wrapper.setProps({ isSaving: false })
      await wrapper.setProps({ isSaving: true })

      vi.advanceTimersByTime(2000)
      await nextTick()

      expect(wrapper.find(indicator).exists()).toBeTruthy()
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
      getInternalSpace: () => mock<SpaceResource>()
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
