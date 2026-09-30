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
  it('disables the confirm button until a group is selected', async () => {
    const { wrapper } = getWrapper()
    expect(wrapper.emitted('update:confirmDisabled').at(-1)).toEqual([true])
    await selectGroups(wrapper, [mock<Group>()])
    expect(wrapper.emitted('update:confirmDisabled').at(-1)).toEqual([false])
  })
  it('passes the selected groups to the input', async () => {
    const groups = [mock<Group>()]
    const { wrapper } = getWrapper()
    await selectGroups(wrapper, groups)
    expect(
      wrapper.findComponent<typeof GroupSelect>('group-select-stub').props('selectedGroups')
    ).toEqual(groups)
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
    it('lists a sum of all assigned groups when multiple users are selected', () => {
      const assignedGroup = mock<Group>({ id: '1' })
      const assignedGroup2 = mock<Group>({ id: '2' })
      const users = [
        mock<User>({ memberOf: [assignedGroup] }),
        mock<User>({ memberOf: [assignedGroup, assignedGroup2] })
      ]
      const groups = [assignedGroup, assignedGroup2, mock<Group>()]
      const { wrapper } = getWrapper({ users, groups })
      const input = wrapper.findComponent<typeof GroupSelect>('group-select-stub')
      expect(input.props('groupOptions').length).toBe(2)
    })
  })

  describe('onConfirm', () => {
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
      await selectGroups(wrapper, groups)

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
      await selectGroups(wrapper, groups)

      await wrapper.vm.onConfirm()
      const { showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalled()
      const { upsertUser } = useUserSettingsStore()
      expect(upsertUser).not.toHaveBeenCalled()
    })
  })
})

async function selectGroups(wrapper: ReturnType<typeof getWrapper>['wrapper'], groups: Group[]) {
  wrapper
    .findComponent<typeof GroupSelect>('group-select-stub')
    .vm.$emit('selectedOptionChange', groups)
  await wrapper.vm.$nextTick()
}

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
