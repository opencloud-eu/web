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
import { OcCheckbox, OcTable } from '@opencloud-eu/design-system/components'
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
      expect(getTableData(wrapper).map((g) => g.displayName)).toEqual(expected)
    })
    it('writes the sort parameters to the route query when the table emits "sort"', () => {
      const { wrapper, mocks } = getWrapper({ groups: getGroupMocks() })
      wrapper.findComponent(OcTable).vm.$emit('sort', {
        sortBy: 'displayName',
        sortDir: SortDir.Desc
      })
      expect(mocks.$router.replace).toHaveBeenCalledWith({
        query: expect.objectContaining({ 'sort-by': 'displayName', 'sort-dir': SortDir.Desc })
      })
    })
  })

  describe('filtering', () => {
    it('only shows groups matching the filter term', () => {
      const { wrapper } = getWrapper({
        groups: [{ displayName: 'users' }, { displayName: 'admins' }] as Group[],
        filterTerm: 'ad'
      })
      expect(getTableData(wrapper).map((g) => g.displayName)).toEqual(['admins'])
    })
    it('shows the empty message if no group matches the filter term', () => {
      const { wrapper } = getWrapper({
        groups: [{ displayName: 'admins' }, { displayName: 'users' }] as Group[],
        filterTerm: 'guests'
      })
      expect(wrapper.find('#admin-settings-groups-empty').exists()).toBeTruthy()
      expect(wrapper.findComponent(OcTable).exists()).toBeFalsy()
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
    it('does not check the header checkbox if only groups of another page are selected', () => {
      const groups = getGroupMocks()
      const { wrapper } = getWrapper({
        mountType: mount,
        groups: [groups[0]],
        selectedGroups: [{ id: 'other-page' } as Group]
      })
      expect(getCheckboxes(wrapper).at(0).props('modelValue')).toBeFalsy()
    })
    it('selects all groups via the header checkbox', () => {
      const groups = getGroupMocks()
      const { wrapper } = getWrapper({ mountType: mount, groups })
      getCheckboxes(wrapper).at(0).vm.$emit('update:modelValue', true)
      const { setSelectedGroups } = useGroupSettingsStore()
      expect(setSelectedGroups).toHaveBeenCalledWith(groups)
    })
    it('de-selects all groups via the header checkbox if all are selected', () => {
      const groups = getGroupMocks()
      const { wrapper } = getWrapper({ mountType: mount, groups, selectedGroups: groups })
      getCheckboxes(wrapper).at(0).vm.$emit('update:modelValue', false)
      const { setSelectedGroups } = useGroupSettingsStore()
      expect(setSelectedGroups).toHaveBeenCalledWith([])
    })
    it('selects a group via its checkbox', () => {
      const groups = getGroupMocks()
      const { wrapper } = getWrapper({ mountType: mount, groups: [groups[0]] })
      getCheckboxes(wrapper).at(1).vm.$emit('update:modelValue', true)
      const { addSelectedGroup } = useGroupSettingsStore()
      expect(addSelectedGroup).toHaveBeenCalledWith(groups[0])
    })
    it('de-selects a selected group via its checkbox', () => {
      const groups = getGroupMocks()
      const { wrapper } = getWrapper({
        mountType: mount,
        groups: [groups[0]],
        selectedGroups: [groups[0]]
      })
      getCheckboxes(wrapper).at(1).vm.$emit('update:modelValue', false)
      const { setSelectedGroups } = useGroupSettingsStore()
      expect(setSelectedGroups).toHaveBeenCalledWith([])
    })
  })
})

function getTableData(wrapper: ReturnType<typeof getWrapper>['wrapper']) {
  return wrapper.findComponent(OcTable).props('data') as Group[]
}

function getCheckboxes(wrapper: ReturnType<typeof getWrapper>['wrapper']) {
  return wrapper.findAllComponents(OcCheckbox)
}

function getWrapper({
  mountType = shallowMount,
  groups = [],
  selectedGroups = [],
  query = {},
  filterTerm = ''
}: {
  mountType?: typeof mount
  groups?: Group[]
  selectedGroups?: Group[]
  query?: Record<string, string>
  filterTerm?: string
} = {}) {
  vi.mocked(queryItemAsString).mockImplementationOnce(() => '1')
  vi.mocked(queryItemAsString).mockImplementationOnce(() => '100')
  const mocks = defaultComponentMocks({
    currentRoute: { name: 'route', path: '/', query, meta: {} } as RouteLocationNormalizedLoaded
  })

  return {
    mocks,
    wrapper: mountType(GroupsList, {
      props: { filterTerm },
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
