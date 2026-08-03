import TrashOverview from '../../../../src/views/trash/Overview.vue'
import { useResourcesViewDefaults } from '../../../../src/composables'
import { useResourcesViewDefaultsMock } from '../../../../tests/mocks/useResourcesViewDefaultsMock'
import {
  defaultComponentMocks,
  defaultPlugins,
  defaultStubs,
  mount,
  RouteLocation
} from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { nextTick } from 'vue'
import { SpaceResource } from '@opencloud-eu/web-client'
import { ResourceTable } from '@opencloud-eu/web-pkg'
import { SortDir } from '@opencloud-eu/design-system/helpers'
import { flushPromises } from '@vue/test-utils'

vi.mock('../../../../src/composables')

const spaceMocks = [
  {
    id: '1',
    storageId: '1',
    name: 'Personal',
    path: '',
    type: 'space',
    isFolder: true,
    disabled: false,
    driveType: 'personal',
    getDriveAliasAndItem: () => '1',
    getDomSelector: () => '1',
    isOwner: () => true,
    hasTrashedItems: true
  },
  {
    id: '2',
    storageId: '2',
    name: 'Project space 1',
    path: '',
    type: 'space',
    isFolder: true,
    disabled: false,
    driveType: 'project',
    getDriveAliasAndItem: () => '2',
    getDomSelector: () => '2',
    isOwner: () => false,
    hasTrashedItems: true
  },
  {
    id: '3',
    storageId: '3',
    name: 'Project space 2',
    path: '',
    type: 'space',
    isFolder: true,
    disabled: false,
    driveType: 'project',
    getDriveAliasAndItem: () => '3',
    getDomSelector: () => '3',
    isOwner: () => false,
    hasTrashedItems: true
  }
] as unknown as SpaceResource[]

describe('TrashOverview', () => {
  it('should render no content message if no spaces exist', async () => {
    const { wrapper } = getWrapper({ spaces: [] })
    await flushPromises()
    expect(wrapper.find('no-content-message-stub').exists()).toBeTruthy()
  })
  it('should navigate to single space trash if only one space exists', async () => {
    const { mocks } = getWrapper({ spaces: [spaceMocks[0]] })
    await flushPromises()
    expect(mocks.$router.push).toHaveBeenCalledWith({
      name: 'files-trash-generic',
      params: { driveAliasAndItem: spaceMocks[0].getDriveAliasAndItem(undefined) },
      query: {}
    })
  })
  describe('view states', () => {
    it('shows the loading spinner during loading', async () => {
      const { wrapper } = getWrapper()
      await nextTick()
      expect(wrapper.find('oc-spinner-stub').exists()).toBeTruthy()
    })
    it('should render trash list', async () => {
      const { wrapper } = getWrapper()
      await flushPromises()
      expect(wrapper.html()).toMatchSnapshot()
    })
  })
  describe('sorting', () => {
    it('sorts by property name', async () => {
      const { wrapper } = getWrapper()
      await flushPromises()
      let sortedSpaces = []
      ;(wrapper.vm as any).sortBy = 'name'

      await nextTick()
      sortedSpaces = wrapper.findComponent(ResourceTable).props().resources as SpaceResource[]
      expect(sortedSpaces.map((s) => s.id)).toEqual([
        spaceMocks[0].id,
        spaceMocks[1].id,
        spaceMocks[2].id
      ])
      ;(wrapper.vm as any).sortDir = SortDir.Desc
      await nextTick()
      sortedSpaces = wrapper.findComponent(ResourceTable).props().resources as SpaceResource[]
      expect(sortedSpaces.map((s) => s.id)).toEqual([
        spaceMocks[0].id,
        spaceMocks[2].id,
        spaceMocks[1].id
      ])
    })
    it('should set the sort parameters accordingly when calling "handleSort"', () => {
      const { wrapper } = getWrapper({ spaces: [spaceMocks[0]] })
      const sortBy = 'name'
      const sortDir = SortDir.Desc
      ;(wrapper.vm as any).handleSort({ sortBy, sortDir })
      expect((wrapper.vm as any).sortBy).toEqual(sortBy)
      expect((wrapper.vm as any).sortDir).toEqual(sortDir)
    })
  })
  describe('indicators', () => {
    const intersectionObserver = window.IntersectionObserver

    beforeEach(() => {
      // table rows only render their content once observed as visible, which never happens in jsdom
      delete (window as any).IntersectionObserver
    })

    afterEach(() => {
      window.IntersectionObserver = intersectionObserver
    })

    it('shows the trashed items indicator for spaces that have trashed items', async () => {
      const { wrapper } = getWrapper({ stubResourceTable: false })
      await flushPromises()
      expect(
        wrapper.findAll('[data-test-indicator-type="resource-space-has-trashed-items"]').length
      ).toEqual(spaceMocks.length)
    })
    it('does not show the trashed items indicator for spaces without trashed items', async () => {
      const spaces = spaceMocks.map((space) => ({ ...space, hasTrashedItems: false }))
      const { wrapper } = getWrapper({
        spaces: spaces as unknown as SpaceResource[],
        stubResourceTable: false
      })
      await flushPromises()
      expect(wrapper.findAll('.oc-tbody-tr').length).toEqual(spaceMocks.length)
      expect(
        wrapper.find('[data-test-indicator-type="resource-space-has-trashed-items"]').exists()
      ).toBeFalsy()
    })
    it('does not show the space enabled and disabled indicators', async () => {
      const { wrapper } = getWrapper({ stubResourceTable: false })
      await flushPromises()
      expect(
        wrapper.find('[data-test-indicator-type="resource-space-enabled"]').exists()
      ).toBeFalsy()
      expect(
        wrapper.find('[data-test-indicator-type="resource-space-disabled"]').exists()
      ).toBeFalsy()
    })
  })
  describe('filtering', () => {
    it('shows only filtered spaces if filter applied', async () => {
      const { wrapper } = getWrapper()
      ;(wrapper.vm as any).filterTerm = 'Personal'
      await nextTick()
      expect((wrapper.vm as any).displaySpaces.length).toEqual(1)
      expect((wrapper.vm as any).displaySpaces[0].id).toEqual(spaceMocks[0].id)
    })
  })
})

function getWrapper({
  spaces = spaceMocks,
  stubResourceTable = true
}: { spaces?: SpaceResource[]; stubResourceTable?: boolean } = {}) {
  const mocks = {
    ...defaultComponentMocks({
      currentRoute: mock<RouteLocation>({ name: 'trash-overview' })
    })
  }

  const plugins = [...defaultPlugins({ piniaOptions: { spacesState: { spaces } } })]
  vi.mocked(useResourcesViewDefaults).mockImplementation(() => useResourcesViewDefaultsMock())

  mocks.$clientService.graphAuthenticated.drives.listMyDrives.mockResolvedValue(spaceMocks)

  return {
    mocks,
    wrapper: mount(TrashOverview, {
      global: {
        stubs: {
          ...defaultStubs,
          NoContentMessage: true,
          ...(!stubResourceTable && { 'resource-table': false, 'trash-quick-actions': true })
        },
        mocks,
        provide: mocks,
        plugins
      }
    })
  }
}
