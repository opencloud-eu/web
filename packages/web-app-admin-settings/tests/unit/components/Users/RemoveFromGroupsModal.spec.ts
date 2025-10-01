import RemoveFromGroupsModal from '../../../../src/components/Users/RemoveFromGroupsModal.vue'
import { defaultComponentMocks, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { Group, User } from '@opencloud-eu/web-client/graph/generated'
import { Modal, useMessages } from '@opencloud-eu/web-pkg'
import { useUserSettingsStore } from '../../../../src/composables/stores/userSettings'
import GroupSelect from '../../../../src/components/Users/GroupSelect.vue'

describe('RemoveFromGroupsModal', () => {
  it('renders the input', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.find('group-select-stub').exists()).toBeTruthy()
  })

  describe('available groups', () => {
    it('lists only groups the user is assigned to', () => {
      const assignedGroup = mock<Group>({ id: '1' })
      const users = [mock<User>({ memberOf: [assignedGroup] })]
      const groups = [assignedGroup, mock<Group>()]
      const { wrapper } = getWrapper({ users, groups })
      const input = wrapper.findComponent<typeof GroupSelect>('group-select-stub')
      expect(input.props('groupOptions').length).toBe(1)
    })
  })

  describe('method "onConfirm"', () => {
    it('removes all users from the given groups', async () => {
      const users = [
        mock<User>({ memberOf: [{ id: '1' }] }),
        mock<User>({ memberOf: [{ id: '1' }] })
      ]
      const groups = [mock<Group>({ id: '1' })]
      const { wrapper, mocks } = getWrapper({ users, groups })
      mocks.$clientService.graphAuthenticated.groups.deleteMember.mockResolvedValue(undefined)
      mocks.$clientService.graphAuthenticated.users.getUser.mockResolvedValue(
        mock<User>({ id: 'e3515ffb-d264-4dfc-8506-6c239f6673b5' })
      )

      wrapper.vm.selectedOptions = groups

      await wrapper.vm.onConfirm()
      const { showMessage } = useMessages()
      expect(showMessage).toHaveBeenCalled()
      const { upsertUser } = useUserSettingsStore()
      expect(upsertUser).toHaveBeenCalledTimes(users.length)
    })

    it('should show message on error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)

      const users = [
        mock<User>({ memberOf: [{ id: '1' }] }),
        mock<User>({ memberOf: [{ id: '1' }] })
      ]
      const groups = [mock<Group>({ id: '1' })]
      const { wrapper, mocks } = getWrapper({ users, groups })
      mocks.$clientService.graphAuthenticated.groups.deleteMember.mockRejectedValue(new Error(''))
      mocks.$clientService.graphAuthenticated.users.getUser.mockRejectedValue(new Error(''))

      wrapper.vm.selectedOptions = groups

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
    wrapper: shallowMount(RemoveFromGroupsModal, {
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
