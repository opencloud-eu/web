import { User } from '@opencloud-eu/web-client/graph/generated'
import DetailsPanel from '../../../../../src/components/Users/SideBar/DetailsPanel.vue'
import { PartialComponentProps, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { SideBarNoSelection, SpaceQuota } from '@opencloud-eu/web-pkg'

const defaultUser = { displayName: 'user', memberOf: [] } as User

describe('DetailsPanel', () => {
  describe('computed method "user"', () => {
    it('should be set if only one user is given', () => {
      const { wrapper } = getWrapper({ props: { user: defaultUser, users: [defaultUser] } })
      expect(wrapper.vm.user).toEqual(defaultUser)
    })
    it('should not be set if no users are given', () => {
      const { wrapper } = getWrapper({
        props: { user: null, users: [] }
      })
      expect(wrapper.vm.user).toEqual(null)
    })
    it('should not be set if multiple users are given', () => {
      const { wrapper } = getWrapper({
        props: { user: null, users: [defaultUser, { displayName: 'user2' } as User] }
      })
      expect(wrapper.vm.user).toEqual(null)
    })
  })

  describe('computed method "noUsers"', () => {
    it('should be true if no users are given', () => {
      const { wrapper } = getWrapper({
        props: { user: null, users: [] }
      })
      expect(wrapper.find('[data-testid="no-users-selected"]').exists()).toBeTruthy()
    })
    it('should be false if users are given', () => {
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

  describe('computed method "multipleUsers"', () => {
    it('should be false if no users are given', () => {
      const { wrapper } = getWrapper({ props: { user: null, users: [] } })
      expect(wrapper.find('#oc-users-details-multiple-sidebar').exists()).toBeFalsy()
    })
    it('should be false if one user is given', () => {
      const { wrapper } = getWrapper({ props: { user: defaultUser, users: [defaultUser] } })
      expect(wrapper.find('#oc-users-details-multiple-sidebar').exists()).toBeFalsy()
    })
    it('should be true if multiple users are given', () => {
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
