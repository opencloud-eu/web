import AddToGroupsModal from '../../../../src/components/Users/AddToGroupsModal.vue'
import { defaultComponentMocks, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { Group, User } from '@opencloud-eu/web-client/graph/generated'
import { Modal, useMessages } from '@opencloud-eu/web-pkg'
import { useUserSettingsStore } from '../../../../src/composables/stores/userSettings'
import GroupSelect from '../../../../src/components/Users/GroupSelect.vue'

describe('AddToGroupsModal', () => {
  it('renders the input', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find('group-select-stub').exists()).toBeTruthy()
  })

  describe('available groups', () => {
    it('lists all available groups if user is not assigned to any', () => {
      const users = [mock<User>({ memberOf: [] })]
      const groups = [mock<Group>(), mock<Group>()]
      const { wrapper } = getWrapper({ users, groups })
      const input = wrapper.findComponent<typeof GroupSelect>('group-select-stub')
      expect(input.props('groupOptions').length).toBe(groups.length)
    })
    it('only lists groups the user is not already assigned to if one user given', () => {
      const assignedGroup = mock<Group>({ id: '1' })
      const users = [mock<User>({ memberOf: [assignedGroup] })]
      const groups = [assignedGroup, mock<Group>()]
      const { wrapper } = getWrapper({ users, groups })
      const input = wrapper.findComponent<typeof GroupSelect>('group-select-stub')
      expect(input.props('groupOptions').length).toBe(1)
    })
    it('lists all available groups if more than one user given', () => {
      const assignedGroup = mock<Group>({ id: '1' })
      const users = [mock<User>({ memberOf: [assignedGroup] }), mock<User>({ memberOf: [] })]
      const groups = [assignedGroup, mock<Group>()]
      const { wrapper } = getWrapper({ users, groups })
      const input = wrapper.findComponent<typeof GroupSelect>('group-select-stub')
      expect(input.props('groupOptions').length).toBe(groups.length)
    })
  })

  describe('method "onConfirm"', () => {
    it('adds all users to the given groups', async () => {
      const users = [mock<User>({ memberOf: [] }), mock<User>({ memberOf: [] })]
      const groups = [mock<Group>(), mock<Group>()]
      const { wrapper, mocks } = getWrapper({ users, groups })
      mocks.$clientService.graphAuthenticated.groups.addMember.mockResolvedValue(undefined)
      mocks.$clientService.graphAuthenticated.users.getUser.mockResolvedValue(
        mock<User>({ id: 'e3515ffb-d264-4dfc-8506-6c239f6673b5' })
      )
      ;(wrapper.vm as any).selectedOptions = groups

      await wrapper.vm.onConfirm()
      const { showMessage } = useMessages()
      expect(showMessage).toHaveBeenCalled()
      const { upsertUser } = useUserSettingsStore()
      expect(upsertUser).toHaveBeenCalledTimes(users.length)
    })

    it('should show message on error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)

      const users = [mock<User>({ memberOf: [] }), mock<User>({ memberOf: [] })]
      const groups = [mock<Group>(), mock<Group>()]
      const { wrapper, mocks } = getWrapper({ users, groups })
      mocks.$clientService.graphAuthenticated.groups.addMember.mockRejectedValue(new Error(''))
      mocks.$clientService.graphAuthenticated.users.getUser.mockRejectedValue(new Error(''))
      ;(wrapper.vm as any).selectedOptions = groups

      await wrapper.vm.onConfirm()
      const { showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalled()
      const { upsertUser } = useUserSettingsStore()
      expect(upsertUser).not.toHaveBeenCalled()
    })
  })
})

function getWrapper({ users = [mock<User>({ memberOf: [] })], groups = [mock<Group>()] } = {}) {
  const mocks = defaultComponentMocks()

  return {
    mocks,
    wrapper: shallowMount(AddToGroupsModal, {
      props: {
        modal: mock<Modal>(),
        users,
        groups
      },
      global: {
        provide: mocks,
        plugins: [...defaultPlugins()],
        stubs: { GroupSelect: true }
      }
    })
  }
}
