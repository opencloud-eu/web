import CreateGroupModal from '../../../../src/components/Groups/CreateGroupModal.vue'
import {
  defaultComponentMocks,
  defaultPlugins,
  mockAxiosResolve,
  shallowMount
} from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { flushPromises } from '@vue/test-utils'
import { Modal, useMessages } from '@opencloud-eu/web-pkg'
import { OcTextInput } from '@opencloud-eu/design-system/components'
import { useGroupSettingsStore } from '../../../../src/composables'
import { Group } from '@opencloud-eu/web-client/graph/generated'

describe('CreateGroupModal', () => {
  it('disables the confirm button initially', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.emitted('update:confirmDisabled').at(-1)).toEqual([true])
  })

  describe('display name validation', () => {
    it('shows an error when the display name is empty', async () => {
      const { wrapper } = getWrapper()
      await setDisplayName(wrapper, ' ')
      expect(getDisplayNameInput(wrapper).props('errorMessage')).toBe('Group name cannot be empty')
      expect(wrapper.emitted('update:confirmDisabled').at(-1)).toEqual([true])
    })
    it('shows an error when the display name is longer than 255 characters', async () => {
      const { wrapper } = getWrapper()
      await setDisplayName(wrapper, 'n'.repeat(256))
      expect(getDisplayNameInput(wrapper).props('errorMessage')).toBe(
        'Group name cannot exceed 255 characters'
      )
    })
    it('shows an error when the group already exists', async () => {
      const { wrapper, mocks } = getWrapper()
      const { getGroup } = mocks.$clientService.graphAuthenticated.groups
      getGroup.mockResolvedValue(mock<Group>({ displayName: 'admins' }))
      await setDisplayName(wrapper, 'admins')
      expect(getGroup).toHaveBeenCalledWith('admins')
      expect(getDisplayNameInput(wrapper).props('errorMessage')).toBe(
        'Group "admins" already exists'
      )
    })
    it('enables the confirm button when the display name is valid', async () => {
      const { wrapper, mocks } = getWrapper()
      mocks.$clientService.graphAuthenticated.groups.getGroup.mockRejectedValue(new Error(''))
      await setDisplayName(wrapper, 'users')
      expect(getDisplayNameInput(wrapper).props('errorMessage')).toBe('')
      expect(wrapper.emitted('update:confirmDisabled').at(-1)).toEqual([false])
    })
  })

  describe('onConfirm', () => {
    it('does not create a group if the form is invalid', async () => {
      const { wrapper, mocks } = getWrapper()
      await expect(wrapper.vm.onConfirm()).rejects.toBeUndefined()
      expect(mocks.$clientService.graphAuthenticated.groups.createGroup).not.toHaveBeenCalled()
    })
    it('creates the group on success', async () => {
      const { wrapper, mocks } = getWrapper()
      const { groups } = mocks.$clientService.graphAuthenticated
      groups.getGroup.mockRejectedValue(new Error(''))
      groups.createGroup.mockResolvedValue(mock<Group>({ id: '1' }))
      await setDisplayName(wrapper, 'foo bar')

      await wrapper.vm.onConfirm()

      expect(groups.createGroup).toHaveBeenCalledWith({ displayName: 'foo bar' })
      const { showMessage } = useMessages()
      expect(showMessage).toHaveBeenCalled()
      const { upsertGroup } = useGroupSettingsStore()
      expect(upsertGroup).toHaveBeenCalled()
    })
    it('shows an error message on failure', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { wrapper, mocks } = getWrapper()
      const { groups } = mocks.$clientService.graphAuthenticated
      groups.getGroup.mockRejectedValue(new Error(''))
      groups.createGroup.mockRejectedValue(mockAxiosResolve({ id: '1' }))
      await setDisplayName(wrapper, 'foo bar')

      await wrapper.vm.onConfirm()

      const { showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalled()
      const { upsertGroup } = useGroupSettingsStore()
      expect(upsertGroup).not.toHaveBeenCalled()
    })
  })
})

function getDisplayNameInput(wrapper: ReturnType<typeof getWrapper>['wrapper']) {
  return wrapper.findComponent(OcTextInput)
}

async function setDisplayName(wrapper: ReturnType<typeof getWrapper>['wrapper'], value: string) {
  getDisplayNameInput(wrapper).vm.$emit('update:modelValue', value)
  await flushPromises()
}

function getWrapper() {
  const mocks = defaultComponentMocks()

  return {
    mocks,
    wrapper: shallowMount(CreateGroupModal, {
      props: {
        modal: mock<Modal>()
      },
      global: {
        mocks,
        provide: mocks,
        plugins: [...defaultPlugins()]
      }
    })
  }
}
