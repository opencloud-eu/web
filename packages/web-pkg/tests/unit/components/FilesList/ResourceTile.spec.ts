import { defaultComponentMocks, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import ResourceTile from '../../../../src/components/FilesList/ResourceTile.vue'
import { mock } from 'vitest-mock-extended'
import { RouteLocation } from 'vue-router'
import { SpaceResource } from '@opencloud-eu/web-client'

const getSpaceMock = (disabled = false) =>
  ({
    name: 'Space 1',
    id: '1',
    storageId: '1',
    path: '',
    type: 'space',
    isFolder: true,
    disabled,
    getDriveAliasAndItem: () => '1'
  }) as unknown as SpaceResource

describe('OcTile component', () => {
  it('renders default space correctly', () => {
    const wrapper = getWrapper({ resource: getSpaceMock() })
    expect(wrapper.html()).toMatchSnapshot()
  })
  it('renders disabled space correctly', () => {
    const wrapper = getWrapper({ resource: getSpaceMock(true), isResourceDisabled: true })
    expect(wrapper.html()).toMatchSnapshot()
  })
  it('renders selected resource correctly', () => {
    const wrapper = getWrapper({ resource: getSpaceMock(), isResourceSelected: true })
    expect(wrapper.find('.oc-tile-card-selected').exists()).toBeTruthy()
  })
  it.each(['xlarge, xxlarge, xxxlarge'])(
    'renders resource icon size correctly',
    (resourceIconSize) => {
      const wrapper = getWrapper({ resource: getSpaceMock(), resourceIconSize })
      expect(wrapper.find('resource-icon-stub').attributes().size).toEqual(resourceIconSize)
    }
  )
  it('shows a loading spinner if isLoading is set to true', () => {
    const wrapper = getWrapper({ resource: getSpaceMock(), isLoading: true })
    expect(wrapper.find('.oc-tile-card-loading-spinner').exists()).toBeTruthy()
  })

  function getWrapper(props = {}) {
    const defaultMocks = defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'files' })
    })

    return shallowMount(ResourceTile, {
      props,
      global: {
        plugins: [
          ...defaultPlugins({ piniaOptions: { spacesState: { spaces: [getSpaceMock(false)] } } })
        ],
        renderStubDefaultSlot: true,
        mocks: defaultMocks,
        provide: defaultMocks
      }
    })
  }
})
