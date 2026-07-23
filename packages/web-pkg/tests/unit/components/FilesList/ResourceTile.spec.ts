import {
  defaultComponentMocks,
  defaultPlugins,
  PartialComponentProps,
  shallowMount
} from '@opencloud-eu/web-test-helpers'
import ResourceTile from '../../../../src/components/FilesList/ResourceTile.vue'
import { mock } from 'vitest-mock-extended'
import { RouteLocation } from 'vue-router'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'

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
    const resource = getSpaceMock()
    const wrapper = getWrapper({ resource }, { selectedIds: [resource.id] })
    expect(wrapper.find('.oc-tile-card-selected').exists()).toBeTruthy()
  })
  it.each(['size-12, size-22, size-42'])(
    'renders resource icon size correctly',
    (resourceIconSize) => {
      const wrapper = getWrapper({ resource: getSpaceMock(), resourceIconSize })
      expect(wrapper.find('resource-icon-stub').attributes('sizeclass')).toEqual(resourceIconSize)
    }
  )
  it('shows a loading spinner if isLoading is set to true', () => {
    const wrapper = getWrapper({ resource: getSpaceMock(), isLoading: true })
    expect(wrapper.find('.oc-tile-card-loading-spinner').exists()).toBeTruthy()
  })

  function getWrapper(
    props: PartialComponentProps<typeof ResourceTile> & { resource: Resource },
    resourcesStore = {}
  ) {
    const defaultMocks = defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'files' })
    })

    return shallowMount(ResourceTile, {
      props,
      global: {
        plugins: [
          ...defaultPlugins({
            piniaOptions: { spacesState: { spaces: [getSpaceMock(false)] }, resourcesStore }
          })
        ],
        renderStubDefaultSlot: true,
        mocks: defaultMocks,
        provide: defaultMocks
      }
    })
  }
})
