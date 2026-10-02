import { nextTick } from 'vue'
import Users from '../../../src/views/Users.vue'
import { ItemFilter, OptionsConfig, useAppDefaults } from '@opencloud-eu/web-pkg'
import { mock, mockDeep } from 'vitest-mock-extended'
import {
  defaultComponentMocks,
  defaultPlugins,
  mount,
  shallowMount,
  useAppDefaultsMock
} from '@opencloud-eu/web-test-helpers'
import { Action, ClientService, SideBarPanel } from '@opencloud-eu/web-pkg'
import { Group, User } from '@opencloud-eu/web-client/graph/generated'
import { flushPromises } from '@vue/test-utils'
import { RouteLocationNormalizedLoaded } from 'vue-router'
import AppTemplate from '../../../src/components/AppTemplate.vue'
import { useUserSettingsStore } from '../../../src/composables/stores/userSettings'

vi.mock('@opencloud-eu/web-pkg', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useAppDefaults: vi.fn()
}))
vi.mocked(useAppDefaults).mockImplementation(() => useAppDefaultsMock())

const getDefaultUser = (): User => {
  return {
    id: '1',
    displayName: 'Admin',
    givenName: 'Admin',
    surname: 'Admin',
    memberOf: [],
    mail: 'admin@example.org',
    drive: {
      id: '1',
      name: 'admin',
      quota: { remaining: 5000000000, state: 'normal', total: 5000000000, used: 0 }
    },
    appRoleAssignments: [
      {
        appRoleId: '1',
        id: '1',
        principalId: '1',
        principalType: 'User',
        resourceDisplayName: 'OpenCloud',
        resourceId: 'some-graph-app-id'
      }
    ]
  } as User
}

const getDefaultApplications = () => {
  return [
    {
      appRoles: [
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
      displayName: 'OpenCloud',
      id: 'some-graph-app-id'
    }
  ]
}

const getClientService = () => {
  const clientService = mockDeep<ClientService>()
  clientService.graphAuthenticated.users.listUsers.mockResolvedValue([mock<User>(getDefaultUser())])
  clientService.graphAuthenticated.users.getUser.mockResolvedValue(mock<User>(getDefaultUser()))
  clientService.graphAuthenticated.users.editUser.mockResolvedValue(mock<User>(getDefaultUser()))
  clientService.graphAuthenticated.groups.listGroups.mockResolvedValue([mock<Group>()])
  clientService.graphAuthenticated.applications.listApplications.mockResolvedValue(
    getDefaultApplications()
  )
  return clientService
}

const selectors = {
  itemFilterGroupsStub: 'item-filter-stub[filtername="groups"]',
  itemFilterRolesStub: 'item-filter-stub[filtername="roles"]'
}

describe('Users view', () => {
  describe('list view', () => {
    it('renders the loaded users initially', async () => {
      const clientService = getClientService()
      const { wrapper } = getMountedWrapper({
        mountType: mount,
        clientService,
        users: [getDefaultUser()]
      })
      await flushPromises()
      expect(clientService.graphAuthenticated.users.listUsers).toHaveBeenCalledTimes(1)
      expect(wrapper.find('.users-table').text()).toContain('admin@example.org')
      expect(wrapper.find('no-content-message-stub').exists()).toBeFalsy()
      expect(wrapper.find(selectors.itemFilterGroupsStub).exists()).toBeTruthy()
      expect(wrapper.find(selectors.itemFilterRolesStub).exists()).toBeTruthy()
    })
    it('renders a warning initially if filters are mandatory', async () => {
      const clientService = getClientService()
      const { wrapper } = getMountedWrapper({
        mountType: mount,
        clientService,
        options: { userListRequiresFilter: true }
      })
      await flushPromises()
      expect(clientService.graphAuthenticated.users.listUsers).not.toHaveBeenCalled()
      expect(wrapper.find('.users-table').exists()).toBeFalsy()
      expect(wrapper.find('no-content-message-stub').exists()).toBeTruthy()
    })
  })

  describe('side bar panels', () => {
    it('should contain EditPanel when one user is selected', () => {
      const { wrapper } = getMountedWrapper()
      expect(
        getSideBarPanels(wrapper)
          .find(({ name }) => name === 'EditPanel')
          .isVisible({ items: [{ id: '1' } as User] })
      ).toBeTruthy()
    })
    it('should contain DetailsPanel no user is selected', () => {
      const { wrapper } = getMountedWrapper()
      expect(
        getSideBarPanels(wrapper)
          .find(({ name }) => name === 'DetailsPanel')
          .isVisible({ items: [] })
      ).toBeTruthy()
    })
    it('should not contain EditPanel when multiple users are selected', () => {
      const { wrapper } = getMountedWrapper()
      expect(
        getSideBarPanels(wrapper)
          .find(({ name }) => name === 'EditPanel')
          .isVisible({ items: [{ id: '1' }, { id: '2' }] as User[] })
      ).toBeFalsy()
    })
  })

  describe('additional user data', () => {
    it('loads the selected user once when the same selection is set again while loading', async () => {
      const clientService = getClientService()
      getMountedWrapper({ mountType: mount, clientService })
      await flushPromises()
      const userSettingsStore = useUserSettingsStore()
      const user = { ...getDefaultUser(), id: '2' }
      let resolveUser: (user: User) => void
      clientService.graphAuthenticated.users.getUser.mockReturnValue(
        new Promise<User>((resolve) => {
          resolveUser = resolve
        }) as ReturnType<typeof clientService.graphAuthenticated.users.getUser>
      )

      // the quick action button selects the user, then the row click handler
      // resets the selection and selects the same user again
      userSettingsStore.selectedUsers.push(user)
      await nextTick()
      userSettingsStore.selectedUsers = []
      userSettingsStore.selectedUsers.push(user)
      await nextTick()
      resolveUser(mock<User>(user))
      await flushPromises()

      expect(clientService.graphAuthenticated.users.getUser).toHaveBeenCalledTimes(1)
      expect(clientService.graphAuthenticated.users.getUser).toHaveBeenCalledWith(
        '2',
        {},
        expect.anything()
      )
    })
  })

  describe('batch actions', () => {
    it('do not display when no user selected', async () => {
      const { wrapper } = getMountedWrapper({ mountType: mount })
      await flushPromises()
      expect(wrapper.find('batch-actions-stub').exists()).toBeFalsy()
    })
    it('display when one user selected', async () => {
      const { wrapper } = getMountedWrapper({
        mountType: mount,
        selectedUsers: [{ id: '1' } as User]
      })
      await flushPromises()
      expect(wrapper.find('batch-actions-stub').exists()).toBeTruthy()
    })
    it('show the delete action last', async () => {
      const { wrapper } = getMountedWrapper({
        mountType: mount,
        selectedUsers: [{ id: '1' }] as User[]
      })
      await flushPromises()
      const batchActions = wrapper.findComponent(AppTemplate).props('batchActions') as Action[]
      expect(batchActions.length).toBeGreaterThan(1)
      expect(batchActions.at(-1).name).toBe('delete')
    })
    it('display when more than one users selected', async () => {
      const { wrapper } = getMountedWrapper({
        mountType: mount,
        selectedUsers: [{ id: '1' }, { id: '2' }] as User[]
      })
      await flushPromises()
      expect(wrapper.find('batch-actions-stub').exists()).toBeTruthy()
    })
  })

  describe('filter', () => {
    describe('groups', () => {
      it('does filter users by groups when the "selectionChange"-event is triggered', async () => {
        const clientService = getClientService()
        const { wrapper } = getMountedWrapper({ mountType: mount, clientService })
        await flushPromises()
        expect(clientService.graphAuthenticated.users.listUsers).toHaveBeenCalledTimes(1)
        wrapper
          .findComponent<typeof ItemFilter>(selectors.itemFilterGroupsStub)
          .vm.$emit('selectionChange', [{ id: '1' }])
        await flushPromises()
        expect(clientService.graphAuthenticated.users.listUsers).toHaveBeenCalledTimes(2)
        expect(clientService.graphAuthenticated.users.listUsers).toHaveBeenNthCalledWith(
          2,
          {
            orderBy: ['displayName'],
            filter: "(memberOf/any(m:m/id eq '1'))",
            expand: ['appRoleAssignments']
          },
          expect.anything()
        )
      })
      it('does filter initially if group ids are given via query param', async () => {
        const groupIdsQueryParam = '1+2'
        const clientService = getClientService()
        getMountedWrapper({
          mountType: mount,
          clientService,
          groupFilterQuery: groupIdsQueryParam
        })
        await flushPromises()
        expect(clientService.graphAuthenticated.users.listUsers).toHaveBeenCalledWith(
          {
            orderBy: ['displayName'],
            filter: "(memberOf/any(m:m/id eq '1') or memberOf/any(m:m/id eq '2'))",
            expand: ['appRoleAssignments']
          },
          expect.anything()
        )
      })
    })
    describe('roles', () => {
      it('does filter users by roles when the "selectionChange"-event is triggered', async () => {
        const clientService = getClientService()
        const { wrapper } = getMountedWrapper({ mountType: mount, clientService })
        await flushPromises()
        expect(clientService.graphAuthenticated.users.listUsers).toHaveBeenCalledTimes(1)
        wrapper
          .findComponent<typeof ItemFilter>(selectors.itemFilterRolesStub)
          .vm.$emit('selectionChange', [{ id: '1' }])
        await flushPromises()
        expect(clientService.graphAuthenticated.users.listUsers).toHaveBeenCalledTimes(2)
        expect(clientService.graphAuthenticated.users.listUsers).toHaveBeenNthCalledWith(
          2,
          {
            orderBy: ['displayName'],
            filter: "(appRoleAssignments/any(m:m/appRoleId eq '1'))",
            expand: ['appRoleAssignments']
          },
          expect.anything()
        )
      })
      it('does filter initially if role ids are given via query param', async () => {
        const roleIdsQueryParam = '1+2'
        const clientService = getClientService()
        getMountedWrapper({
          mountType: mount,
          clientService,
          roleFilterQuery: roleIdsQueryParam
        })
        await flushPromises()
        expect(clientService.graphAuthenticated.users.listUsers).toHaveBeenCalledWith(
          {
            orderBy: ['displayName'],
            filter:
              "(appRoleAssignments/any(m:m/appRoleId eq '1') or appRoleAssignments/any(m:m/appRoleId eq '2'))",
            expand: ['appRoleAssignments']
          },
          expect.anything()
        )
      })
    })
    describe('search term', () => {
      it('searches initially if a search term is given via query param', async () => {
        const clientService = getClientService()
        getMountedWrapper({ mountType: mount, clientService, displayNameFilterQuery: 'Albert' })
        await flushPromises()
        // the server search covers the display name, the user name and the email
        expect(clientService.graphAuthenticated.users.listUsers).toHaveBeenCalledWith(
          {
            orderBy: ['displayName'],
            filter: '',
            search: '"Albert"',
            expand: ['appRoleAssignments']
          },
          expect.anything()
        )
      })
      it('combines the search with the group filter', async () => {
        const clientService = getClientService()
        getMountedWrapper({
          mountType: mount,
          clientService,
          displayNameFilterQuery: 'alice-1db',
          groupFilterQuery: '1'
        })
        await flushPromises()
        expect(clientService.graphAuthenticated.users.listUsers).toHaveBeenCalledWith(
          expect.objectContaining({
            filter: "(memberOf/any(m:m/id eq '1'))",
            search: '"alice-1db"'
          }),
          expect.anything()
        )
      })
      it('removes double quotes from the search term', async () => {
        const clientService = getClientService()
        getMountedWrapper({ mountType: mount, clientService, displayNameFilterQuery: 'Al"bert' })
        await flushPromises()
        expect(clientService.graphAuthenticated.users.listUsers).toHaveBeenCalledWith(
          expect.objectContaining({ search: '"Albert"' }),
          expect.anything()
        )
      })
    })
  })
})

function getSideBarPanels(wrapper: ReturnType<typeof getMountedWrapper>['wrapper']) {
  return wrapper.findComponent(AppTemplate).props('sideBarAvailablePanels') as SideBarPanel<
    unknown,
    unknown,
    User
  >[]
}

function getMountedWrapper({
  mountType = shallowMount,
  clientService = getClientService(),
  displayNameFilterQuery = null,
  groupFilterQuery = null,
  roleFilterQuery = null,
  options = {},
  users = [],
  selectedUsers = []
}: {
  mountType?: typeof shallowMount | typeof mount
  clientService?: ReturnType<typeof mockDeep<ClientService>>
  displayNameFilterQuery?: string
  groupFilterQuery?: string
  roleFilterQuery?: string
  options?: OptionsConfig
  users?: User[]
  selectedUsers?: User[]
} = {}) {
  const query: Record<string, string> = {
    ...(displayNameFilterQuery && { q_search_term: displayNameFilterQuery }),
    ...(groupFilterQuery && { q_groups: groupFilterQuery }),
    ...(roleFilterQuery && { q_roles: roleFilterQuery })
  }
  const mocks = {
    ...defaultComponentMocks({
      currentRoute: { name: 'route', path: '/', query, meta: {} } as RouteLocationNormalizedLoaded
    }),
    $clientService: clientService
  }

  const user = { id: '1' } as User

  return {
    mocks,
    wrapper: mountType(Users, {
      global: {
        plugins: [
          ...defaultPlugins({
            piniaOptions: {
              userState: { user },
              configState: { options },
              userSettingsStore: { users, selectedUsers }
            }
          })
        ],
        mocks,
        provide: mocks,
        stubs: {
          AppLoadingSpinner: true,
          ViewOptions: true,
          OcBreadcrumb: true,
          NoContentMessage: true,
          ItemFilter: true,
          BatchActions: true,
          OcButton: true
        }
      }
    })
  }
}
