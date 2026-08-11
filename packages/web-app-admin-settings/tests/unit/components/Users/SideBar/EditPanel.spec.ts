import { nextTick, reactive } from 'vue'
import EditPanel from '../../../../../src/components/Users/SideBar/EditPanel.vue'
import {
  defaultComponentMocks,
  defaultPlugins,
  mockAxiosReject,
  shallowMount
} from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { Drive, Group, User } from '@opencloud-eu/web-client/graph/generated'
import { CapabilityStore } from '@opencloud-eu/web-pkg'
import GroupSelect from '../../../../../src/components/Users/GroupSelect.vue'

const availableGroupOptions = [
  mock<Group>({ id: '1', displayName: 'group1', groupTypes: [] }),
  mock<Group>({ id: '2', displayName: 'group2', groupTypes: [] })
]
const selectors = {
  groupSelectStub: 'group-select-stub'
}

describe('EditPanel', () => {
  it('renders all available inputs', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.html()).toMatchSnapshot()
  })
  it('filters selected groups when passing the options to the GroupSelect component', () => {
    const { wrapper } = getWrapper({ selectedGroups: [availableGroupOptions[0]] })
    const selectedGroups = wrapper
      .findComponent<typeof GroupSelect>(selectors.groupSelectStub)
      .props('selectedGroups')
    const groupOptions = wrapper
      .findComponent<typeof GroupSelect>(selectors.groupSelectStub)
      .props('groupOptions')
    expect(selectedGroups.length).toBe(1)
    expect(selectedGroups[0].id).toEqual(availableGroupOptions[0].id)
    expect(groupOptions.length).toBe(1)
    expect(groupOptions[0].id).toEqual(availableGroupOptions[1].id)
  })

  describe('method "isInputFieldReadOnly"', () => {
    it('should be true if included in capability readOnlyUserAttributes list', () => {
      const { wrapper } = getWrapper({ readOnlyUserAttributes: ['user.displayName'] })
      expect((wrapper.vm as any).isInputFieldReadOnly('user.displayName')).toBeTruthy()
    })
    it('should be false if not included in capability readOnlyUserAttributes list', () => {
      const { wrapper } = getWrapper()
      expect((wrapper.vm as any).isInputFieldReadOnly('user.displayName')).toBeFalsy()
    })
  })

  describe('method "revertChanges"', () => {
    it('should revert changes on property editUser', () => {
      const { wrapper } = getWrapper()
      ;(wrapper.vm as any).editUser.displayName = 'jana'
      ;(wrapper.vm as any).editUser.mail = 'jana@opencloud.eu'
      ;(wrapper.vm as any).revertChanges()
      expect((wrapper.vm as any).editUser.displayName).toEqual('jan')
      expect((wrapper.vm as any).editUser.mail).toEqual('jan@opencloud.eu')
    })
    it('should revert changes on property formData', () => {
      const { wrapper } = getWrapper()
      ;(wrapper.vm as any).formData.displayName.valid = false
      ;(wrapper.vm as any).formData.displayName.errorMessage = 'error'
      ;(wrapper.vm as any).revertChanges()
      expect((wrapper.vm as any).formData.displayName.valid).toBeTruthy()
      expect((wrapper.vm as any).formData.displayName.errorMessage).toEqual('')
    })
  })

  describe('method "validateUserName"', () => {
    it('should be false when userName is empty', async () => {
      const { wrapper } = getWrapper()
      ;(wrapper.vm as any).editUser.onPremisesSamAccountName = ''
      expect(await (wrapper.vm as any).validateUserName()).toBeFalsy()
    })
    it('should be false if userName is longer than 255 characters', async () => {
      const { wrapper } = getWrapper()
      ;(wrapper.vm as any).editUser.onPremisesSamAccountName = 'n'.repeat(256)
      expect(await (wrapper.vm as any).validateUserName()).toBeFalsy()
    })
    it('should be false when userName contains white spaces', async () => {
      const { wrapper } = getWrapper()
      ;(wrapper.vm as any).editUser.onPremisesSamAccountName = 'jan owncCloud'
      expect(await (wrapper.vm as any).validateUserName()).toBeFalsy()
    })
    it('should be false when userName starts with a numeric value', async () => {
      const { wrapper } = getWrapper()
      ;(wrapper.vm as any).editUser.onPremisesSamAccountName = '1moretry'
      expect(await (wrapper.vm as any).validateUserName()).toBeFalsy()
    })
    it('should be false when userName is already existing', async () => {
      const { wrapper, mocks } = getWrapper()
      const graphMock = mocks.$clientService.graphAuthenticated
      const getUserStub = graphMock.users.getUser.mockResolvedValue(
        mock<User>({ onPremisesSamAccountName: 'jan' })
      )
      ;(wrapper.vm as any).editUser.onPremisesSamAccountName = 'jan'
      expect(await (wrapper.vm as any).validateUserName()).toBeFalsy()
      expect(getUserStub).toHaveBeenCalled()
    })
    it('should be true when userName is valid', async () => {
      const { wrapper, mocks } = getWrapper()
      const graphMock = mocks.$clientService.graphAuthenticated
      const getUserStub = graphMock.users.getUser.mockRejectedValue(() => mockAxiosReject())
      ;(wrapper.vm as any).editUser.onPremisesSamAccountName = 'jana'
      expect(await (wrapper.vm as any).validateUserName()).toBeTruthy()
      expect(getUserStub).toHaveBeenCalled()
    })
  })

  describe('method "validateDisplayName"', () => {
    it('should return true if displayName is valid', () => {
      const { wrapper } = getWrapper()
      ;(wrapper.vm as any).editUser.displayName = 'jan'
      expect((wrapper.vm as any).validateDisplayName()).toBeTruthy()
      expect((wrapper.vm as any).formData.displayName.valid).toBeTruthy()
    })
    it('should be false if displayName is longer than 255 characters', async () => {
      const { wrapper } = getWrapper()
      ;(wrapper.vm as any).editUser.displayName = 'n'.repeat(256)
      expect(await (wrapper.vm as any).validateDisplayName()).toBeFalsy()
    })
    it('should return false if displayName is not valid', () => {
      const { wrapper } = getWrapper()
      ;(wrapper.vm as any).editUser.displayName = ''
      expect((wrapper.vm as any).validateDisplayName()).toBeFalsy()
      expect((wrapper.vm as any).formData.displayName.valid).toBeFalsy()
    })
  })

  describe('method "validateEmail"', () => {
    it('should return true if email is valid', () => {
      const { wrapper } = getWrapper()
      ;(wrapper.vm as any).editUser.mail = 'jan@opencloud.eu'
      expect((wrapper.vm as any).validateEmail()).toBeTruthy()
      expect((wrapper.vm as any).formData.email.valid).toBeTruthy()
    })
    it('should return false if email is not valid', () => {
      const { wrapper } = getWrapper()
      ;(wrapper.vm as any).editUser.mail = ''
      expect((wrapper.vm as any).validateEmail()).toBeFalsy()
      expect((wrapper.vm as any).formData.email.valid).toBeFalsy()
    })
  })

  describe('computed method "invalidFormData"', () => {
    it('should be false if formData is invalid', () => {
      const { wrapper } = getWrapper()
      ;(wrapper.vm as any).formData.displayName.valid = true
      expect((wrapper.vm as any).invalidFormData).toBeFalsy()
    })
    it('should be true if formData is valid', () => {
      const { wrapper } = getWrapper()
      ;(wrapper.vm as any).formData.displayName.valid = false
      expect((wrapper.vm as any).invalidFormData).toBeTruthy()
    })
  })

  describe('group select', () => {
    it('takes all available groups', () => {
      const { wrapper } = getWrapper()
      expect(
        wrapper.findComponent<typeof GroupSelect>('group-select-stub').props('groupOptions').length
      ).toBe(availableGroupOptions.length)
    })
    it('filters out read-only groups', () => {
      const { wrapper } = getWrapper({
        groups: [mock<Group>({ id: '1', displayName: 'group1', groupTypes: ['ReadOnly'] })]
      })
      expect(
        wrapper.findComponent<typeof GroupSelect>('group-select-stub').props('groupOptions').length
      ).toBe(0)
    })
    it('takes no groups if the user groups have not been loaded yet', () => {
      const { wrapper } = getWrapper({ user: { id: '2' } as User })
      expect(
        wrapper.findComponent<typeof GroupSelect>('group-select-stub').props('groupOptions')
      ).toEqual([])
    })
  })

  describe('expanded user attributes', () => {
    it('are applied to the edit user once loaded', async () => {
      const user = reactive({ id: '2', displayName: 'jan' } as User)
      const { wrapper } = getWrapper({ user })
      expect((wrapper.vm as any).editUser.memberOf).toBeUndefined()

      Object.assign(user, {
        memberOf: [availableGroupOptions[0]],
        drive: { quota: { total: 100 } } as Drive
      })
      await nextTick()

      expect((wrapper.vm as any).editUser.memberOf.map((g: Group) => g.id)).toEqual([
        availableGroupOptions[0].id
      ])
      expect((wrapper.vm as any).editUser.drive.quota.total).toBe(100)
    })
  })
})

function getWrapper({
  readOnlyUserAttributes = [],
  selectedGroups = [],
  groups = availableGroupOptions,
  user = undefined
}: {
  readOnlyUserAttributes?: string[]
  selectedGroups?: Group[]
  groups?: Group[]
  user?: User
} = {}) {
  const mocks = defaultComponentMocks()
  const capabilities = {
    graph: { users: { read_only_attributes: readOnlyUserAttributes } }
  } satisfies Partial<CapabilityStore['capabilities']>

  return {
    mocks,
    wrapper: shallowMount(EditPanel, {
      props: {
        user:
          user ??
          ({
            id: '2',
            displayName: 'jan',
            mail: 'jan@opencloud.eu',
            passwordProfile: { password: '' },
            drive: { quota: {} } as Drive,
            memberOf: selectedGroups
          } as User),
        roles: [{ id: '1', displayName: 'admin' }],
        groups,
        applicationId: '1'
      },
      global: {
        mocks,
        provide: mocks,
        plugins: [...defaultPlugins({ piniaOptions: { capabilityState: { capabilities } } })]
      }
    })
  }
}
