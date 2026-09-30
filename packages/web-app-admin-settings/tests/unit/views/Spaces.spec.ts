import { SpaceResource } from '@opencloud-eu/web-client'
import { Graph } from '@opencloud-eu/web-client/graph'
import { mockDeep } from 'vitest-mock-extended'
import {
  AppLoadingSpinner,
  ClientService,
  useAppDefaults,
  ViewOptions
} from '@opencloud-eu/web-pkg'
import { OcBreadcrumb } from '@opencloud-eu/design-system/components'
import {
  defaultComponentMocks,
  defaultPlugins,
  mount,
  useAppDefaultsMock
} from '@opencloud-eu/web-test-helpers'
import Spaces from '../../../src/views/Spaces.vue'
import SpacesList from '../../../src/components/Spaces/SpacesList.vue'
import { flushPromises } from '@vue/test-utils'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  queryItemAsString: vi.fn(),
  useAppDefaults: vi.fn(),
  useRouteQueryPersisted: vi.fn()
}))
vi.mocked(useAppDefaults).mockImplementation(() => useAppDefaultsMock({}))

const selectors = {
  noContentMessageStub: 'no-content-message-stub',
  batchActionsStub: 'batch-actions-stub'
}

describe('Spaces view', () => {
  describe('loading states', () => {
    it('should show loading spinner if loading', () => {
      const { wrapper } = getWrapper()
      expect(wrapper.findComponent(AppLoadingSpinner).exists()).toBeTruthy()
    })
    it('should render spaces list after loading has been finished', async () => {
      const spaces = [{ id: '1', name: 'Some Space' }] as SpaceResource[]
      const { wrapper } = getWrapper({ spaces })
      await flushPromises()
      expect(wrapper.findComponent(AppLoadingSpinner).exists()).toBeFalsy()
      expect(wrapper.findComponent(SpacesList).exists()).toBeTruthy()
      expect(wrapper.find(selectors.noContentMessageStub).exists()).toBeFalsy()
    })
  })
  it('renders the app bar with breadcrumbs, view options and search', async () => {
    const { wrapper } = getWrapper()
    await flushPromises()
    expect(
      wrapper
        .findComponent(OcBreadcrumb)
        .props('items')
        .map(({ text }) => text)
    ).toEqual(['Spaces'])
    expect(wrapper.findComponent(ViewOptions).exists()).toBeTruthy()
    expect(wrapper.find('#admin-settings-app-bar input').attributes('placeholder')).toBe(
      'Search for spaces'
    )
  })
  it('passes the search term to the spaces list', async () => {
    const { wrapper } = getWrapper()
    await flushPromises()
    expect(wrapper.findComponent(SpacesList).props('filterTerm')).toBe('')
    await wrapper.find('#admin-settings-app-bar input').setValue('Some')
    expect(wrapper.findComponent(SpacesList).props('filterTerm')).toBe('Some')
  })
  it('should render no content message if no spaces found', async () => {
    const graph = mockDeep<Graph>()
    graph.drives.listAllDrives.mockResolvedValue([])
    const { wrapper } = getWrapper({ spaces: [] })
    await flushPromises()
    expect(wrapper.find(selectors.noContentMessageStub).exists()).toBeTruthy()
  })
  describe('batch actions', () => {
    it('do not display when no space selected', async () => {
      const { wrapper } = getWrapper()
      await flushPromises()
      expect(wrapper.find(selectors.batchActionsStub).exists()).toBeFalsy()
    })
    it('display when one space selected', async () => {
      const spaces = [{ id: '1', name: 'Some Space' }] as SpaceResource[]
      const { wrapper } = getWrapper({ spaces, selectedSpaces: spaces })
      await flushPromises()
      expect(wrapper.find(selectors.batchActionsStub).exists()).toBeTruthy()
    })
    it('display when more than one space selected', async () => {
      const spaces = [
        { id: '1', name: 'Some Space' },
        { id: '1', name: 'Some other Space' }
      ] as SpaceResource[]
      const { wrapper } = getWrapper({ spaces, selectedSpaces: spaces })
      await flushPromises()
      expect(wrapper.find(selectors.batchActionsStub).exists()).toBeTruthy()
    })
  })
})

function getWrapper({
  spaces = [
    {
      id: '1',
      name: 'space'
    } as SpaceResource
  ],
  selectedSpaces = []
}: { spaces?: SpaceResource[]; selectedSpaces?: SpaceResource[] } = {}) {
  const $clientService = mockDeep<ClientService>()
  $clientService.graphAuthenticated.drives.listAllDrives.mockResolvedValue(spaces)
  const mocks = {
    ...defaultComponentMocks(),
    $clientService
  }

  return {
    wrapper: mount(Spaces, {
      global: {
        plugins: [
          ...defaultPlugins({
            piniaOptions: {
              spaceSettingsStore: {
                spaces,
                selectedSpaces
              }
            }
          })
        ],
        mocks,
        provide: mocks,
        stubs: {
          AppLoadingSpinner: true,
          NoContentMessage: true,
          SpacesList: true,
          OcBreadcrumb: true,
          BatchActions: true,
          ViewOptions: true
        }
      }
    })
  }
}
