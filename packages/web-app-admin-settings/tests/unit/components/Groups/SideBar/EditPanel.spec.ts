import EditPanel from '../../../../../src/components/Groups/SideBar/EditPanel.vue'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { flushPromises } from '@vue/test-utils'
import { CompareSaveDialog, useMessages } from '@opencloud-eu/web-pkg'
import { OcTextInput } from '@opencloud-eu/design-system/components'
import { Group } from '@opencloud-eu/web-client/graph/generated'
import { useGroupSettingsStore } from '../../../../../src/composables'

describe('EditPanel', () => {
  it('renders the display name input with the current group name', () => {
    const { wrapper } = getWrapper()
    const input = getDisplayNameInput(wrapper)
    expect(input.props('label')).toBe('Group name')
    expect(input.props('modelValue')).toBe('group')
    expect(input.props('errorMessage')).toBe('')
  })

  describe('display name validation', () => {
    it('ignores the result of a name check that finished after the name changed', async () => {
      const { wrapper, mocks } = getWrapper()
      let rejectLookup: (error: Error) => void
      mocks.$clientService.graphAuthenticated.groups.getGroup.mockReturnValueOnce(
        new Promise((_, reject) => {
          rejectLookup = reject
        }) as ReturnType<typeof mocks.$clientService.graphAuthenticated.groups.getGroup>
      )
      getDisplayNameInput(wrapper).vm.$emit('update:modelValue', 'ab')
      await setDisplayName(wrapper, '')
      rejectLookup(new Error(''))
      await flushPromises()
      expect(getDisplayNameInput(wrapper).props('errorMessage')).toBe('Group name cannot be empty')
      expect(getCompareSaveDialog(wrapper).props('confirmButtonDisabled')).toEqual(true)
    })
    it('accepts a display name that is not taken yet', async () => {
      const { wrapper, mocks } = getWrapper()
      const { getGroup } = mocks.$clientService.graphAuthenticated.groups
      getGroup.mockRejectedValue(new Error(''))
      await setDisplayName(wrapper, 'users')
      expect(getGroup).toHaveBeenCalledWith('users')
      expect(getDisplayNameInput(wrapper).props('errorMessage')).toBe('')
      expect(getCompareSaveDialog(wrapper).props('confirmButtonDisabled')).toBeFalsy()
    })
    it('shows an error if the display name is longer than 255 characters', async () => {
      const { wrapper } = getWrapper()
      await setDisplayName(wrapper, 'n'.repeat(256))
      expect(getDisplayNameInput(wrapper).props('errorMessage')).toBe(
        'Group name cannot exceed 255 characters'
      )
      expect(getCompareSaveDialog(wrapper).props('confirmButtonDisabled')).toBeTruthy()
    })
    it('shows an error if the display name is empty', async () => {
      const { wrapper } = getWrapper()
      await setDisplayName(wrapper, '')
      expect(getDisplayNameInput(wrapper).props('errorMessage')).toBe('Group name cannot be empty')
      expect(getCompareSaveDialog(wrapper).props('confirmButtonDisabled')).toBeTruthy()
    })
    it('shows an error if the display name is already taken', async () => {
      const { wrapper, mocks } = getWrapper()
      const { getGroup } = mocks.$clientService.graphAuthenticated.groups
      getGroup.mockResolvedValue(mock<Group>({ displayName: 'users' }))
      await setDisplayName(wrapper, 'users')
      expect(getGroup).toHaveBeenCalledWith('users')
      expect(getDisplayNameInput(wrapper).props('errorMessage')).toBe(
        'Group "users" already exists'
      )
    })
    it('does not look up the group if the display name is unchanged', async () => {
      const { wrapper, mocks } = getWrapper()
      await setDisplayName(wrapper, 'group')
      expect(mocks.$clientService.graphAuthenticated.groups.getGroup).not.toHaveBeenCalled()
      expect(getDisplayNameInput(wrapper).props('errorMessage')).toBe('')
    })
  })

  describe('reverting changes', () => {
    it('resets the display name and the validation state', async () => {
      const { wrapper } = getWrapper()
      await setDisplayName(wrapper, '')
      expect(getDisplayNameInput(wrapper).props('errorMessage')).not.toBe('')

      getCompareSaveDialog(wrapper).vm.$emit('revert')
      await flushPromises()

      expect(getDisplayNameInput(wrapper).props('modelValue')).toBe('group')
      expect(getDisplayNameInput(wrapper).props('errorMessage')).toBe('')
      expect(getCompareSaveDialog(wrapper).props('confirmButtonDisabled')).toBeFalsy()
    })
  })

  describe('saving', () => {
    it('edits the group and marks the changes as saved on success', async () => {
      const { wrapper, mocks } = getWrapper()
      const { groups } = mocks.$clientService.graphAuthenticated
      groups.getGroup.mockRejectedValueOnce(new Error(''))
      await setDisplayName(wrapper, 'administrators')

      const updatedGroup = mock<Group>({ id: '1', displayName: 'administrators' })
      groups.editGroup.mockResolvedValue(undefined)
      groups.getGroup.mockResolvedValue(updatedGroup)

      getCompareSaveDialog(wrapper).vm.$emit('confirm')
      await flushPromises()

      expect(groups.editGroup).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({ id: '1', displayName: 'administrators' })
      )
      const { upsertGroup } = useGroupSettingsStore()
      expect(upsertGroup).toHaveBeenCalledWith(updatedGroup)
      expect(getCompareSaveDialog(wrapper).props('saved')).toBe(true)
    })
    it('shows an error message on failure', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { wrapper, mocks } = getWrapper()
      mocks.$clientService.graphAuthenticated.groups.editGroup.mockRejectedValue(new Error(''))

      getCompareSaveDialog(wrapper).vm.$emit('confirm')
      await flushPromises()

      const { showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalled()
      expect(getCompareSaveDialog(wrapper).props('saved')).toBe(false)
    })
  })
})

type Wrapper = ReturnType<typeof getWrapper>['wrapper']

function getDisplayNameInput(wrapper: Wrapper) {
  return wrapper.findComponent(OcTextInput)
}

function getCompareSaveDialog(wrapper: Wrapper) {
  return wrapper.findComponent(CompareSaveDialog)
}

async function setDisplayName(wrapper: Wrapper, value: string) {
  getDisplayNameInput(wrapper).vm.$emit('update:modelValue', value)
  await flushPromises()
}

function getWrapper() {
  const mocks = defaultComponentMocks()

  return {
    mocks,
    wrapper: mount(EditPanel, {
      props: {
        group: { id: '1', displayName: 'group', members: [] }
      },
      global: {
        mocks,
        provide: mocks,
        plugins: [...defaultPlugins()],
        stubs: {
          OcTextInput: true,
          'avatar-image': true,
          'oc-button': true,
          translate: true
        }
      }
    })
  }
}
