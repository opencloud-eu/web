import { nextTick, reactive } from 'vue'
import EditPanel from '../../../../../src/components/Users/SideBar/EditPanel.vue'
import { defaultComponentMocks, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { Drive, Group, User } from '@opencloud-eu/web-client/graph/generated'
import { CapabilityStore, CompareSaveDialog, QuotaSelect } from '@opencloud-eu/web-pkg'
import { OcSelect, OcSwitch, OcTextInput } from '@opencloud-eu/design-system/components'
import { flushPromises } from '@vue/test-utils'
import GroupSelect from '../../../../../src/components/Users/GroupSelect.vue'

const availableGroupOptions = [
  mock<Group>({ id: '1', displayName: 'group1', groupTypes: [] }),
  mock<Group>({ id: '2', displayName: 'group2', groupTypes: [] })
]
const selectors = {
  groupSelectStub: 'group-select-stub',
  userNameInput: 'userName-input',
  displayNameInput: 'displayName-input',
  emailInput: 'email-input',
  passwordInput: 'password-input'
}

describe('EditPanel', () => {
  it('renders all available inputs', () => {
    const { wrapper } = getWrapper()
    expect(getInput(wrapper, selectors.userNameInput).props('modelValue')).toBe('')
    expect(getInput(wrapper, selectors.displayNameInput).props('modelValue')).toBe('jan')
    expect(getInput(wrapper, selectors.emailInput).props('modelValue')).toBe('jan@opencloud.eu')
    expect(getInput(wrapper, selectors.passwordInput).props('modelValue')).toBe('')
    expect(wrapper.findComponent(OcSwitch).props('checked')).toBeTruthy()
    expect(wrapper.findComponent(OcSelect).props('label')).toBe('Role')
    expect(wrapper.findComponent(QuotaSelect).exists()).toBeTruthy()
    expect(wrapper.findComponent<typeof GroupSelect>(selectors.groupSelectStub).exists()).toBe(true)
    expect(getCompareSaveDialog(wrapper).props('confirmButtonDisabled')).toBeFalsy()
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

  describe('read-only attributes', () => {
    it('makes an input read-only if included in capability readOnlyUserAttributes list', () => {
      const { wrapper } = getWrapper({ readOnlyUserAttributes: ['user.displayName'] })
      expect(getInput(wrapper, selectors.displayNameInput).props('readOnly')).toBeTruthy()
    })
    it('does not make an input read-only if not included in capability readOnlyUserAttributes list', () => {
      const { wrapper } = getWrapper()
      expect(getInput(wrapper, selectors.displayNameInput).props('readOnly')).toBeFalsy()
    })
  })

  describe('reverting changes', () => {
    it('reverts changes on the edited user', async () => {
      const { wrapper } = getWrapper()
      await setInput(wrapper, selectors.displayNameInput, 'jana')
      await setInput(wrapper, selectors.emailInput, 'jana@opencloud.eu')
      expect(getCompareSaveDialog(wrapper).props('compareObject')).toMatchObject({
        displayName: 'jana',
        mail: 'jana@opencloud.eu'
      })

      getCompareSaveDialog(wrapper).vm.$emit('revert')
      await nextTick()

      expect(getCompareSaveDialog(wrapper).props('compareObject')).toMatchObject({
        displayName: 'jan',
        mail: 'jan@opencloud.eu'
      })
      expect(getInput(wrapper, selectors.displayNameInput).props('modelValue')).toBe('jan')
    })
    it('resets validation errors', async () => {
      const { wrapper } = getWrapper()
      await setInput(wrapper, selectors.displayNameInput, '')
      expect(getInput(wrapper, selectors.displayNameInput).props('errorMessage')).not.toBe('')
      expect(getCompareSaveDialog(wrapper).props('confirmButtonDisabled')).toBeTruthy()

      getCompareSaveDialog(wrapper).vm.$emit('revert')
      await nextTick()

      expect(getInput(wrapper, selectors.displayNameInput).props('errorMessage')).toBe('')
      expect(getCompareSaveDialog(wrapper).props('confirmButtonDisabled')).toBeFalsy()
    })
  })

  describe('user name validation', () => {
    it('ignores the result of a name check that finished after the name changed', async () => {
      const { wrapper, mocks } = getWrapper()
      let rejectLookup: (error: Error) => void
      mocks.$clientService.graphAuthenticated.users.getUser.mockReturnValueOnce(
        new Promise((_, reject) => {
          rejectLookup = reject
        }) as ReturnType<typeof mocks.$clientService.graphAuthenticated.users.getUser>
      )
      getInput(wrapper, selectors.userNameInput).vm.$emit('update:modelValue', 'ab')
      await setInput(wrapper, selectors.userNameInput, '')
      rejectLookup(new Error(''))
      await flushPromises()
      expect(getInput(wrapper, selectors.userNameInput).props('errorMessage')).toBe(
        'User name cannot be empty'
      )
      expect(getCompareSaveDialog(wrapper).props('confirmButtonDisabled')).toEqual(true)
    })
    it.each([
      { userName: ' ', error: 'User name cannot be empty' },
      { userName: 'n'.repeat(256), error: 'User name cannot exceed 255 characters' },
      { userName: 'jan openCloud', error: 'User name cannot contain white spaces' },
      { userName: '1moretry', error: 'User name cannot start with a number' },
      { userName: 'jan(', error: 'User name cannot contain special characters' }
    ])('shows "$error" for "$userName"', async ({ userName, error }) => {
      const { wrapper } = getWrapper()
      await setInput(wrapper, selectors.userNameInput, userName)
      expect(getInput(wrapper, selectors.userNameInput).props('errorMessage')).toBe(error)
      expect(getCompareSaveDialog(wrapper).props('confirmButtonDisabled')).toBeTruthy()
    })
    it('shows an error when the user name is already taken', async () => {
      const { wrapper, mocks } = getWrapper()
      const { getUser } = mocks.$clientService.graphAuthenticated.users
      getUser.mockResolvedValue(mock<User>({ onPremisesSamAccountName: 'jan' }))
      await setInput(wrapper, selectors.userNameInput, 'jan')
      expect(getUser).toHaveBeenCalledWith('jan')
      expect(getInput(wrapper, selectors.userNameInput).props('errorMessage')).toBe(
        'User "jan" already exists'
      )
    })
    it('accepts a valid user name', async () => {
      const { wrapper, mocks } = getWrapper()
      const { getUser } = mocks.$clientService.graphAuthenticated.users
      getUser.mockRejectedValue(new Error(''))
      await setInput(wrapper, selectors.userNameInput, 'jana')
      expect(getUser).toHaveBeenCalledWith('jana')
      expect(getInput(wrapper, selectors.userNameInput).props('errorMessage')).toBe('')
      expect(getCompareSaveDialog(wrapper).props('confirmButtonDisabled')).toBeFalsy()
    })
  })

  describe('display name validation', () => {
    it.each([
      { displayName: '', error: 'First and last name cannot be empty' },
      { displayName: 'n'.repeat(256), error: 'First and last name cannot exceed 255 characters' }
    ])('shows "$error" for "$displayName"', async ({ displayName, error }) => {
      const { wrapper } = getWrapper()
      await setInput(wrapper, selectors.displayNameInput, displayName)
      expect(getInput(wrapper, selectors.displayNameInput).props('errorMessage')).toBe(error)
      expect(getCompareSaveDialog(wrapper).props('confirmButtonDisabled')).toBeTruthy()
    })
    it('accepts a valid display name', async () => {
      const { wrapper } = getWrapper()
      await setInput(wrapper, selectors.displayNameInput, 'jan')
      expect(getInput(wrapper, selectors.displayNameInput).props('errorMessage')).toBe('')
      expect(getCompareSaveDialog(wrapper).props('confirmButtonDisabled')).toBeFalsy()
    })
  })

  describe('email validation', () => {
    it('accepts a valid email', async () => {
      const { wrapper } = getWrapper()
      await setInput(wrapper, selectors.emailInput, 'jan@opencloud.eu')
      expect(getInput(wrapper, selectors.emailInput).props('errorMessage')).toBe('')
      expect(getCompareSaveDialog(wrapper).props('confirmButtonDisabled')).toBeFalsy()
    })
    it('shows an error for an invalid email', async () => {
      const { wrapper } = getWrapper()
      await setInput(wrapper, selectors.emailInput, '')
      expect(getInput(wrapper, selectors.emailInput).props('errorMessage')).toBe(
        'Please enter a valid email'
      )
      expect(getCompareSaveDialog(wrapper).props('confirmButtonDisabled')).toBeTruthy()
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
      const groupSelect = () => wrapper.findComponent<typeof GroupSelect>(selectors.groupSelectStub)
      expect(groupSelect().props('selectedGroups')).toEqual([])

      Object.assign(user, {
        memberOf: [availableGroupOptions[0]],
        drive: { quota: { total: 100 } } as Drive
      })
      await nextTick()

      expect(
        groupSelect()
          .props('selectedGroups')
          .map((g: Group) => g.id)
      ).toEqual([availableGroupOptions[0].id])
      expect(wrapper.findComponent(QuotaSelect).props('totalQuota')).toBe(100)
    })
  })
})

type Wrapper = ReturnType<typeof getWrapper>['wrapper']

function getInput(wrapper: Wrapper, id: string) {
  return wrapper.findAllComponents(OcTextInput).find((input) => input.attributes('id') === id)
}

async function setInput(wrapper: Wrapper, id: string, value: string) {
  getInput(wrapper, id).vm.$emit('update:modelValue', value)
  await flushPromises()
}

function getCompareSaveDialog(wrapper: Wrapper) {
  return wrapper.findComponent(CompareSaveDialog)
}

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
