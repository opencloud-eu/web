import { SpaceResource } from '@opencloud-eu/web-client'
import { Graph } from '@opencloud-eu/web-client/graph'
import { mockDeep } from 'vitest-mock-extended'
import {
  AppLoadingSpinner,
  ClientService,
  useAppDefaults,
  useSpacesStore,
  ViewOptions,
  SideBarPanel
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
import AppTemplate from '../../../src/components/AppTemplate.vue'
import { useSpaceSettingsStore } from '../../../src/composables'
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
  describe('spaces created via the FAB', () => {
    it('are loaded again including their members', async () => {
      // the store actions have to run for the view to react on the new space
      const { wrapper, mocks } = getWrapper({ stubActions: false })
      await flushPromises()
      const createdSpace = { id: '2', name: 'new', driveType: 'project', root: {} } as SpaceResource
      const spaceWithMembers = {
        id: '2',
        name: 'new',
        driveType: 'project',
        root: { permissions: [] }
      } as SpaceResource
      mocks.$clientService.graphAuthenticated.drives.listAllDrives.mockResolvedValue([
        spaceWithMembers
      ])

      useSpacesStore().upsertSpace(createdSpace)
      await flushPromises()

      expect(mocks.$clientService.graphAuthenticated.drives.listAllDrives).toHaveBeenLastCalledWith(
        {
          filter: "id eq '2'",
          expand: 'root($expand=permissions)'
        }
      )
      const space = useSpacesStore().allProjectSpaces.find(({ id }) => id === '2')
      expect(space.root.permissions).toEqual([])
      wrapper.unmount()
    })
  })

  describe('spaces updated without their members', () => {
    it('ignore outdated responses of earlier requests', async () => {
      const { wrapper, mocks } = getWrapper({ stubActions: false })
      await flushPromises()
      const { listAllDrives } = mocks.$clientService.graphAuthenticated.drives
      const space = (permissions?: unknown[]) =>
        ({ id: '2', name: 'new', driveType: 'project', root: { permissions } }) as SpaceResource
      let resolveFirstLoad: (spaces: SpaceResource[]) => void
      listAllDrives.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirstLoad = resolve
        }) as ReturnType<typeof listAllDrives>
      )
      listAllDrives.mockResolvedValueOnce([space(['admin', 'new member'])])

      // e.g. created via the FAB, then members are added before the first request is done
      const spacesStore = useSpacesStore()
      spacesStore.upsertSpace(space())
      await flushPromises()
      spacesStore.upsertSpace(space())
      await flushPromises()
      resolveFirstLoad([space(['admin'])])
      await flushPromises()

      expect(listAllDrives).toHaveBeenCalledTimes(3)
      const loaded = spacesStore.allProjectSpaces.find(({ id }) => id === '2')
      expect(loaded.root.permissions).toEqual(['admin', 'new member'])
      wrapper.unmount()
    })
  })

  describe('selection', () => {
    it('loads the permissions of the selected spaces', async () => {
      const { wrapper } = getWrapper()
      await flushPromises()
      useSpaceSettingsStore().selectedSpaces = [{ id: '1' } as SpaceResource]
      await flushPromises()
      const { loadGraphPermissions } = useSpacesStore()
      expect(loadGraphPermissions).toHaveBeenCalledWith(expect.objectContaining({ ids: ['1'] }))
      wrapper.unmount()
    })
    it('removes deleted spaces from the selection', async () => {
      const spaces = [
        { id: '1', name: 'one' },
        { id: '2', name: 'two' }
      ] as SpaceResource[]
      const { wrapper } = getWrapper({ spaces, selectedSpaces: spaces, stubActions: false })
      await flushPromises()
      useSpacesStore().removeSpace(spaces[0])
      await flushPromises()
      expect(useSpaceSettingsStore().selectedSpaces.map(({ id }) => id)).toEqual(['2'])
      wrapper.unmount()
    })
  })

  describe('spaces the current user lost access to', () => {
    it('are kept and their members and permissions are loaded again', async () => {
      const spaces = [{ id: '1', name: 'one', driveType: 'project' }] as SpaceResource[]
      const { wrapper, mocks } = getWrapper({ spaces, stubActions: false })
      await flushPromises()
      const spacesStore = useSpacesStore()
      const loadGraphPermissions = vi
        .spyOn(spacesStore, 'loadGraphPermissions')
        .mockResolvedValue(undefined)
      const { listAllDrives } = mocks.$clientService.graphAuthenticated.drives
      listAllDrives.mockClear()

      spacesStore.removeSpace(spaces[0], { deleted: false })
      await flushPromises()

      expect(spacesStore.allProjectSpaces.map(({ id }) => id)).toEqual(['1'])
      expect(listAllDrives).toHaveBeenCalledWith(expect.objectContaining({ filter: "id eq '1'" }))
      expect(loadGraphPermissions).toHaveBeenCalledWith(
        expect.objectContaining({ ids: ['1'], useCache: false })
      )
      wrapper.unmount()
    })
  })

  describe('side bar', () => {
    it('hides the members panel for disabled spaces', () => {
      const { wrapper } = getWrapper()
      const membersPanel = getSideBarPanels(wrapper).find(({ name }) => name === 'space-share')
      expect(membersPanel.isVisible({ items: [{ id: '1' } as SpaceResource] })).toBeTruthy()
      expect(
        membersPanel.isVisible({ items: [{ id: '1', disabled: true } as SpaceResource] })
      ).toBeFalsy()
    })
  })

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
      const spaces = [{ id: '1', name: 'Some Space', graphPermissions: [] }] as SpaceResource[]
      const { wrapper } = getWrapper({ spaces, selectedSpaces: spaces })
      await flushPromises()
      expect(wrapper.find(selectors.batchActionsStub).exists()).toBeTruthy()
    })
    it('display when more than one space selected', async () => {
      const spaces = [
        { id: '1', name: 'Some Space', graphPermissions: [] },
        { id: '1', name: 'Some other Space', graphPermissions: [] }
      ] as SpaceResource[]
      const { wrapper } = getWrapper({ spaces, selectedSpaces: spaces })
      await flushPromises()
      expect(wrapper.find(selectors.batchActionsStub).exists()).toBeTruthy()
    })
    it('show a spinner while the permissions of the selected spaces are loading', async () => {
      const spaces = [{ id: '1', name: 'Some Space' }] as SpaceResource[]
      const { wrapper } = getWrapper({ spaces, selectedSpaces: spaces })
      await flushPromises()
      expect(wrapper.find(selectors.batchActionsStub).exists()).toBeFalsy()
      expect(wrapper.findComponent(AppTemplate).props('batchActionsLoading')).toBeTruthy()
    })
  })
})

function getSideBarPanels(wrapper: ReturnType<typeof getWrapper>['wrapper']) {
  return wrapper.findComponent(AppTemplate).props('sideBarAvailablePanels') as SideBarPanel<
    unknown,
    unknown,
    SpaceResource
  >[]
}

function getWrapper({
  spaces = [
    {
      id: '1',
      name: 'space'
    } as SpaceResource
  ],
  selectedSpaces = [],
  stubActions = true
}: { spaces?: SpaceResource[]; selectedSpaces?: SpaceResource[]; stubActions?: boolean } = {}) {
  const $clientService = mockDeep<ClientService>()
  $clientService.graphAuthenticated.drives.listAllDrives.mockResolvedValue(spaces)
  const mocks = {
    ...defaultComponentMocks(),
    $clientService
  }

  return {
    mocks,
    wrapper: mount(Spaces, {
      global: {
        plugins: [
          ...defaultPlugins({
            piniaOptions: {
              stubActions,
              spacesState: { allProjectSpaces: spaces },
              spaceSettingsStore: { selectedSpaces }
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
