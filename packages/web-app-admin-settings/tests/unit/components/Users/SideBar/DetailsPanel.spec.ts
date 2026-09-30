import { User } from '@opencloud-eu/web-client/graph/generated'
import DetailsPanel from '../../../../../src/components/Users/SideBar/DetailsPanel.vue'
import { PartialComponentProps, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { SideBarNoSelection, SpaceQuota } from '@opencloud-eu/web-pkg'

const defaultUser = { displayName: 'user', memberOf: [] } as User

describe('DetailsPanel', () => {
  describe('user details', () => {
    it('are shown if only one user is given', () => {
      const user = { ...defaultUser, onPremisesSamAccountName: 'jdoe', mail: 'j@doe.org' } as User
      const { wrapper } = getWrapper({ props: { user, users: [user] } })
      const details = wrapper.find('#oc-user-details-sidebar')
      expect(details.exists()).toBeTruthy()
      expect(details.text()).toContain('jdoe')
      expect(details.text()).toContain('user')
      expect(details.text()).toContain('j@doe.org')
    })
    it('are not shown if no users are given', () => {
      const { wrapper } = getWrapper({ props: { user: null, users: [] } })
      expect(wrapper.find('#oc-user-details-sidebar').exists()).toBeFalsy()
    })
    it('are not shown if multiple users are given', () => {
      const { wrapper } = getWrapper({
        props: { user: null, users: [defaultUser, { displayName: 'user2' } as User] }
      })
      expect(wrapper.find('#oc-user-details-sidebar').exists()).toBeFalsy()
    })
    it('show the role display name of the assigned role', () => {
      const user = { ...defaultUser, appRoleAssignments: [{ appRoleId: '2' }] } as User
      const { wrapper } = getWrapper({
        props: {
          user,
          users: [user],
          roles: [
            { id: '1', displayName: 'Admin' },
            { id: '2', displayName: 'Guest' }
          ]
        }
      })
      expect(wrapper.find('#oc-user-details-sidebar').text()).toContain('Guest')
      expect(wrapper.find('#oc-user-details-sidebar').text()).not.toContain('Admin')
    })
    it('show the assigned groups sorted by name', () => {
      const user = {
        ...defaultUser,
        memberOf: [{ displayName: 'users' }, { displayName: 'admins' }]
      } as User
      const { wrapper } = getWrapper({ props: { user, users: [user] } })
      expect(wrapper.find('#oc-user-details-sidebar').text()).toContain('admins, users')
    })
    it.each([
      { accountEnabled: undefined, expected: 'Allowed' },
      { accountEnabled: true, expected: 'Allowed' },
      { accountEnabled: false, expected: 'Forbidden' }
    ])(
      'show the login as "$expected" if accountEnabled is $accountEnabled',
      ({ accountEnabled, expected }) => {
        const user = { ...defaultUser, accountEnabled } as User
        const { wrapper } = getWrapper({ props: { user, users: [user] } })
        expect(wrapper.find('#oc-user-details-sidebar').text()).toContain(expected)
      }
    )
  })

  describe('no selection info', () => {
    it('is shown if no users are given', () => {
      const { wrapper } = getWrapper({
        props: { user: null, users: [] }
      })
      expect(wrapper.find('[data-testid="no-users-selected"]').exists()).toBeTruthy()
    })
    it('is not shown if users are given', () => {
      const { wrapper } = getWrapper({ props: { user: defaultUser, users: [defaultUser] } })
      expect(wrapper.find('[data-testid="no-users-selected"]').exists()).toBeFalsy()
    })
  })

  describe('no selection details', () => {
    it.each([
      [0, '0 users'],
      [1, '1 user'],
      [6, '6 users']
    ])('should show %s as "%s"', (usersCount, definition) => {
      const { wrapper } = getWrapper({ props: { user: null, users: [], usersCount } })
      expect(wrapper.findComponent(SideBarNoSelection).props('details')).toEqual([
        { term: 'Items', definition }
      ])
    })
  })

  describe('multiple selection info', () => {
    it('is not shown if no users are given', () => {
      const { wrapper } = getWrapper({ props: { user: null, users: [] } })
      expect(wrapper.find('#oc-users-details-multiple-sidebar').exists()).toBeFalsy()
    })
    it('is not shown if one user is given', () => {
      const { wrapper } = getWrapper({ props: { user: defaultUser, users: [defaultUser] } })
      expect(wrapper.find('#oc-users-details-multiple-sidebar').exists()).toBeFalsy()
    })
    it('is shown if multiple users are given', () => {
      const { wrapper } = getWrapper({
        props: { user: null, users: [defaultUser, { displayName: 'user2' } as User] }
      })
      expect(wrapper.find('#oc-users-details-multiple-sidebar').exists()).toBeTruthy()
    })
  })

  describe('quota', () => {
    it('shows the quota usage if the user has a drive', () => {
      const quota = { total: 10, used: 1, remaining: 9, state: 'normal' }
      const user = { ...defaultUser, drive: { quota } } as User
      const { wrapper } = getWrapper({ props: { user, users: [user] } })
      expect(wrapper.findComponent(SpaceQuota).props('spaceQuota')).toEqual(quota)
    })
    it('does not show the quota usage if the user has no drive yet', () => {
      const { wrapper } = getWrapper({ props: { user: defaultUser, users: [defaultUser] } })
      expect(wrapper.findComponent(SpaceQuota).exists()).toBeFalsy()
    })
  })
})

function getWrapper({ props }: { props: PartialComponentProps<typeof DetailsPanel> }) {
  return {
    wrapper: shallowMount(DetailsPanel, {
      props: {
        users: [],
        roles: [],
        ...props
      },
      global: {
        plugins: [...defaultPlugins()]
      }
    })
  }
}
