import UsersList from '../../../../src/components/Users/UsersList.vue'
import {
  defaultComponentMocks,
  defaultPlugins,
  mount,
  shallowMount
} from '@opencloud-eu/web-test-helpers'
import { queryItemAsString, useSideBar } from '@opencloud-eu/web-pkg'
import { useUserSettingsStore } from '../../../../src/composables/stores/userSettings'
import { User } from '@opencloud-eu/web-client/graph/generated'
import { SortDir } from '@opencloud-eu/design-system/helpers'
import { RouteLocationNormalizedLoaded } from 'vue-router'

const getUserMocks = () => [{ id: '1', displayName: 'jan' }] as User[]
vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  queryItemAsString: vi.fn()
}))

describe('UsersList', () => {
  describe('computed method "allUsersSelected"', () => {
    it('should be true if all users are selected', () => {
      const { wrapper } = getWrapper({
        users: getUserMocks(),
        selectedUsers: getUserMocks()
      })
      expect(wrapper.vm.allUsersSelected).toBeTruthy()
    })
    it('should be false if not every user is selected', () => {
      const { wrapper } = getWrapper({
        users: getUserMocks(),
        selectedUsers: []
      })
      expect(wrapper.vm.allUsersSelected).toBeFalsy()
    })
  })

  describe('sorting', () => {
    it('sorts by user name ascending by default', () => {
      const { wrapper } = getWrapper({
        users: [
          { onPremisesSamAccountName: 'user' },
          { onPremisesSamAccountName: 'admin' }
        ] as User[]
      })
      expect(wrapper.vm.items.map((u) => u.onPremisesSamAccountName)).toEqual(['admin', 'user'])
    })
    it.each([
      { sortDir: SortDir.Asc, expected: ['admin', 'user'] },
      { sortDir: SortDir.Desc, expected: ['user', 'admin'] }
    ])('sorts by display name from the route query ($sortDir)', ({ sortDir, expected }) => {
      const { wrapper } = getWrapper({
        users: [{ displayName: 'user' }, { displayName: 'admin' }] as User[],
        query: { 'sort-by': 'displayName', 'sort-dir': sortDir }
      })
      expect(wrapper.vm.items.map((u) => u.displayName)).toEqual(expected)
    })
    it.each([
      { sortDir: SortDir.Asc, expected: ['1', '2'] },
      { sortDir: SortDir.Desc, expected: ['2', '1'] }
    ])('sorts by role display name from the route query ($sortDir)', ({ sortDir, expected }) => {
      const { wrapper } = getWrapper({
        users: [
          { id: '2', appRoleAssignments: [{ appRoleId: '2' }] },
          { id: '1', appRoleAssignments: [{ appRoleId: '1' }] }
        ] as User[],
        query: { 'sort-by': 'role', 'sort-dir': sortDir }
      })
      expect(wrapper.vm.items.map((u) => u.id)).toEqual(expected)
    })
    it('treats users without "accountEnabled" as enabled when sorting by login', () => {
      const { wrapper } = getWrapper({
        users: [{ id: '1' }, { id: '2', accountEnabled: false }] as User[],
        query: { 'sort-by': 'accountEnabled', 'sort-dir': SortDir.Asc }
      })
      expect(wrapper.vm.items.map((u) => u.id)).toEqual(['2', '1'])
    })
    it('writes the sort parameters to the route query when calling "handleSort"', () => {
      const { wrapper, mocks } = getWrapper()
      wrapper.vm.handleSort({ sortBy: 'mail', sortDir: SortDir.Desc })
      expect(mocks.$router.replace).toHaveBeenCalledWith({
        query: expect.objectContaining({ 'sort-by': 'mail', 'sort-dir': SortDir.Desc })
      })
    })
  })
  it('should show the user details on details button click', async () => {
    const users = getUserMocks()
    const { wrapper } = getWrapper({ mountType: mount, users })

    const { openSideBar } = useSideBar()
    await wrapper.find('.users-table-btn-details').trigger('click')
    expect(openSideBar).toHaveBeenCalled()
  })
  it('should show the user edit panel on edit button click', async () => {
    const users = getUserMocks()
    const { wrapper } = getWrapper({ mountType: mount, users })

    const { openSideBarPanel } = useSideBar()
    await wrapper.find('.users-table-btn-edit').trigger('click')
    expect(openSideBarPanel).toHaveBeenCalledWith('EditPanel')
  })
  describe('toggle selection', () => {
    describe('selectUsers method', () => {
      it('selects all users', () => {
        const users = getUserMocks()
        const { wrapper } = getWrapper({ mountType: shallowMount, users })
        wrapper.vm.selectUsers(users)
        const { setSelectedUsers } = useUserSettingsStore()
        expect(setSelectedUsers).toHaveBeenCalledWith(users)
      })
    })
    describe('selectUsers method', () => {
      it('selects a user', () => {
        const users = getUserMocks()
        const { wrapper } = getWrapper({ mountType: shallowMount, users: [users[0]] })
        wrapper.vm.selectUser(users[0])
        const { addSelectedUser } = useUserSettingsStore()
        expect(addSelectedUser).toHaveBeenCalledWith(users[0])
      })
      it('de-selects a selected user', () => {
        const users = getUserMocks()
        const { wrapper } = getWrapper({
          mountType: shallowMount,
          users: [users[0]],
          selectedUsers: [users[0]]
        })
        wrapper.vm.selectUser(users[0])
        const { setSelectedUsers } = useUserSettingsStore()
        expect(setSelectedUsers).toHaveBeenCalledWith([])
      })
    })
    describe('unselectAllUsers method', () => {
      it('de-selects all selected users', () => {
        const users = getUserMocks()
        const { wrapper } = getWrapper({
          mountType: shallowMount,
          users: [users[0]],
          selectedUsers: [users[0]]
        })
        wrapper.vm.unselectAllUsers()
        const { setSelectedUsers } = useUserSettingsStore()
        expect(setSelectedUsers).toHaveBeenCalledWith([])
      })
    })
  })
})

function getWrapper({
  mountType = shallowMount,
  users = [],
  selectedUsers = [],
  query = {}
}: {
  mountType?: typeof mount
  users?: User[]
  selectedUsers?: User[]
  query?: Record<string, string>
} = {}) {
  vi.mocked(queryItemAsString).mockImplementationOnce(() => '1')
  vi.mocked(queryItemAsString).mockImplementationOnce(() => '100')
  const mocks = defaultComponentMocks({
    currentRoute: { name: 'route', path: '/', query, meta: {} } as RouteLocationNormalizedLoaded
  })
  return {
    mocks,
    wrapper: mountType(UsersList, {
      props: {
        roles: [
          {
            displayName: 'Admin',
            id: '1'
          },
          {
            displayName: 'Guest',
            id: '2'
          },
          {
            displayName: 'Space Admin',
            id: '3'
          },
          {
            displayName: 'User',
            id: '4'
          }
        ],
        headerPosition: 0
      },
      global: {
        plugins: [
          ...defaultPlugins({
            piniaOptions: {
              userSettingsStore: { users, selectedUsers }
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
