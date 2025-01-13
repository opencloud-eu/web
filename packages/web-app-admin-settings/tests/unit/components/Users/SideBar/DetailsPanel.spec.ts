import { User } from '@opencloud-eu/web-client/graph/generated'
import DetailsPanel from '../../../../../src/components/Users/SideBar/DetailsPanel.vue'
import { PartialComponentProps, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'

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
      expect(wrapper.vm.noUsers).toBeTruthy()
    })
    it('should be false if users are given', () => {
      const { wrapper } = getWrapper({ props: { user: defaultUser, users: [defaultUser] } })
      expect(wrapper.vm.noUsers).toBeFalsy()
    })
  })

  describe('computed method "multipleUsers"', () => {
    it('should be false if no users are given', () => {
      const { wrapper } = getWrapper({ props: { user: null, users: [] } })
      expect(wrapper.vm.multipleUsers).toBeFalsy()
    })
    it('should be false if one user is given', () => {
      const { wrapper } = getWrapper({ props: { user: defaultUser, users: [defaultUser] } })
      expect(wrapper.vm.multipleUsers).toBeFalsy()
    })
    it('should be true if multiple users are given', () => {
      const { wrapper } = getWrapper({
        props: { user: null, users: [defaultUser, { displayName: 'user2' } as User] }
      })
      expect(wrapper.vm.multipleUsers).toBeTruthy()
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
