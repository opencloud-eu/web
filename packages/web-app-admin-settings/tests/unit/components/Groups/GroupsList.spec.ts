import GroupsList from '../../../../src/components/Groups/GroupsList.vue'
import {
  defaultComponentMocks,
  defaultPlugins,
  mount,
  shallowMount
} from '@opencloud-eu/web-test-helpers'
import { queryItemAsString, useSideBar } from '@opencloud-eu/web-pkg'
import { useGroupSettingsStore } from '../../../../src/composables'
import { Group } from '@opencloud-eu/web-client/graph/generated'
import { SortDir } from '@opencloud-eu/design-system/helpers'
import { RouteLocationNormalizedLoaded } from 'vue-router'

const getGroupMocks = () =>
  [
    { id: '1', members: [] },
    { id: '2', members: [] }
  ] as Group[]

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  queryItemAsString: vi.fn()
}))

describe('GroupsList', () => {
  describe('sorting', () => {
    it.each([
      { query: {}, expected: ['admins', 'users'] },
      {
        query: { 'sort-by': 'displayName', 'sort-dir': SortDir.Asc },
        expected: ['admins', 'users']
      },
      {
        query: { 'sort-by': 'displayName', 'sort-dir': SortDir.Desc },
        expected: ['users', 'admins']
      }
    ])('sorts by display name based on the route query $query', ({ query, expected }) => {
      const { wrapper } = getWrapper({
        groups: [{ displayName: 'users' }, { displayName: 'admins' }] as Group[],
        query
      })
      expect(wrapper.vm.items.map((g) => g.displayName)).toEqual(expected)
    })
    it('writes the sort parameters to the route query when calling "handleSort"', () => {
      const { wrapper, mocks } = getWrapper()
      wrapper.vm.handleSort({ sortBy: 'displayName', sortDir: SortDir.Desc })
      expect(mocks.$router.replace).toHaveBeenCalledWith({
        query: expect.objectContaining({ 'sort-by': 'displayName', 'sort-dir': SortDir.Desc })
      })
    })
  })

  describe('method "filter"', () => {
    it('should return a list containing record admins if search term is "ad"', () => {
      const { wrapper } = getWrapper()

      expect(
        wrapper.vm.filter([{ displayName: 'users' }, { displayName: 'admins' }], 'ad')
      ).toEqual([{ displayName: 'admins' }])
    })
    it('should return an an empty list if search term does not match any entry', () => {
      const { wrapper } = getWrapper()

      expect(
        wrapper.vm.filter([{ displayName: 'admins' }, { displayName: 'users' }], 'guests')
      ).toEqual([])
    })
  })
  it('should show the group details on details button click', async () => {
    const groups = getGroupMocks()
    const { wrapper } = getWrapper({ mountType: mount, groups })

    const { openSideBar } = useSideBar()
    await wrapper.find('.groups-table-btn-details').trigger('click')
    expect(openSideBar).toHaveBeenCalled()
  })
  describe('toggle selection', () => {
    describe('selectGroups method', () => {
      it('selects all groups', () => {
        const groups = getGroupMocks()
        const { wrapper } = getWrapper({ mountType: shallowMount, groups })
        wrapper.vm.selectGroups(groups)
        const { setSelectedGroups } = useGroupSettingsStore()
        expect(setSelectedGroups).toHaveBeenCalledWith(groups)
      })
    })
    describe('selectGroup method', () => {
      it('selects a group', () => {
        const groups = getGroupMocks()
        const { wrapper } = getWrapper({ mountType: shallowMount, groups: [groups[0]] })
        wrapper.vm.selectGroup(groups[0])
        const { addSelectedGroup } = useGroupSettingsStore()
        expect(addSelectedGroup).toHaveBeenCalledWith(groups[0])
      })
      it('de-selects a selected group', () => {
        const groups = getGroupMocks()
        const { wrapper } = getWrapper({
          mountType: shallowMount,
          groups: [groups[0]],
          selectedGroups: [groups[0]]
        })
        wrapper.vm.selectGroup(groups[0])
        const { setSelectedGroups } = useGroupSettingsStore()
        expect(setSelectedGroups).toHaveBeenCalledWith([])
      })
    })
    describe('unselectAllGroups method', () => {
      it('de-selects all selected groups', () => {
        const groups = getGroupMocks()
        const { wrapper } = getWrapper({
          mountType: shallowMount,
          groups: [groups[0]],
          selectedGroups: [groups[0]]
        })
        wrapper.vm.unselectAllGroups()
        const { setSelectedGroups } = useGroupSettingsStore()
        expect(setSelectedGroups).toHaveBeenCalledWith([])
      })
    })
  })
})

function getWrapper({
  mountType = shallowMount,
  groups = [],
  selectedGroups = [],
  query = {}
}: {
  mountType?: typeof mount
  groups?: Group[]
  selectedGroups?: Group[]
  query?: Record<string, string>
} = {}) {
  vi.mocked(queryItemAsString).mockImplementationOnce(() => '1')
  vi.mocked(queryItemAsString).mockImplementationOnce(() => '100')
  const mocks = defaultComponentMocks({
    currentRoute: { name: 'route', path: '/', query, meta: {} } as RouteLocationNormalizedLoaded
  })

  return {
    mocks,
    wrapper: mountType(GroupsList, {
      global: {
        plugins: [
          ...defaultPlugins({
            piniaOptions: {
              groupSettingsStore: { groups, selectedGroups }
            }
          })
        ],
        mocks,
        provide: mocks,
        stubs: {
          OcCheckbox: true
        }
      }
    })
  }
}
