import GenericTrash from '../../../../src/views/spaces/GenericTrash.vue'
import { useResourcesViewDefaults } from '../../../../src/composables'
import { useResourcesViewDefaultsMock } from '../../../../tests/mocks/useResourcesViewDefaultsMock'
import { ref } from 'vue'
import { mock } from 'vitest-mock-extended'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import {
  ComponentProps,
  defaultComponentMocks,
  defaultPlugins,
  defaultStubs,
  mount,
  PartialComponentProps,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'
import { AppBar, NoContentMessage, ResourceTable } from '@opencloud-eu/web-pkg'

vi.mock('../../../../src/composables')

describe('GenericTrash view', () => {
  it('appBar always present', () => {
    const { wrapper } = getMountedWrapper()
    expect(wrapper.find('app-bar-stub').exists()).toBeTruthy()
  })
  it('sideBar always present', () => {
    const { wrapper } = getMountedWrapper()
    expect(wrapper.find('file-side-bar-stub').exists()).toBeTruthy()
  })
  it('shows the personal space breadcrumb', () => {
    const { wrapper } = getMountedWrapper()
    expect(
      wrapper.findComponent<typeof AppBar>('app-bar-stub').props().breadcrumbs[1].text
    ).toEqual('Personal space')
  })
  it('shows the project space breadcrumb', () => {
    const space = mock<SpaceResource>({ driveType: 'project' })
    const { wrapper } = getMountedWrapper({ props: { space } })
    expect(
      wrapper.findComponent<typeof AppBar>('app-bar-stub').props().breadcrumbs[1].text
    ).toEqual(space.name)
  })
  describe('different files view states', () => {
    it('shows the loading spinner during loading', () => {
      const { wrapper } = getMountedWrapper({ loading: true })
      expect(wrapper.find('oc-spinner-stub').exists()).toBeTruthy()
    })
    it('shows the no-content-message after loading', () => {
      const { wrapper } = getMountedWrapper()
      expect(wrapper.find('oc-spinner-stub').exists()).toBeFalsy()
      expect(
        wrapper.findComponent<typeof NoContentMessage>({ name: 'no-content-message' }).exists()
      ).toBeTruthy()
    })
    it('shows the files table when files are available', () => {
      const { wrapper } = getMountedWrapper({
        files: [mock<Resource>({ id: '1', getDomSelector: vi.fn(() => '') })]
      })
      expect(
        wrapper.findComponent<typeof NoContentMessage>({ name: 'no-content-message' }).exists()
      ).toBeFalsy()
      expect(wrapper.findComponent<typeof ResourceTable>('.oc-table').exists()).toBeTruthy()
    })
  })
})

function getMountedWrapper({
  mocks = {},
  props = {} as PartialComponentProps<typeof GenericTrash>,
  files = [],
  loading = false
}: {
  mocks?: Record<string, unknown>
  props?: PartialComponentProps<typeof GenericTrash>
  files?: Resource[]
  loading?: boolean
} = {}) {
  vi.mocked(useResourcesViewDefaults).mockImplementation(() =>
    useResourcesViewDefaultsMock({
      paginatedResources: ref(files),
      areResourcesLoading: ref(loading)
    })
  )
  const defaultMocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'files-trash-generic' })
    }),
    ...(mocks && mocks)
  }
  const propsData: ComponentProps<typeof GenericTrash> = {
    space: mock<SpaceResource>({ id: '1', getDriveAliasAndItem: vi.fn(), name: 'Personal space' }),
    ...props
  }
  return {
    mocks: defaultMocks,
    wrapper: mount(GenericTrash, {
      props: propsData,
      global: {
        plugins: [...defaultPlugins()],
        mocks: defaultMocks,
        provide: defaultMocks,
        stubs: { ...defaultStubs, portal: true }
      }
    })
  }
}
