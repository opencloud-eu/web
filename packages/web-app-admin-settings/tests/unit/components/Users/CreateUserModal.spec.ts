import CreateUserModal from '../../../../src/components/Users/CreateUserModal.vue'
import { defaultComponentMocks, defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import { mock } from 'vitest-mock-extended'
import { flushPromises } from '@vue/test-utils'
import { Modal, useMessages } from '@opencloud-eu/web-pkg'
import { OcTextInput } from '@opencloud-eu/design-system/components'
import { useUserSettingsStore } from '../../../../src/composables/stores/userSettings'
import { User } from '@opencloud-eu/web-client/graph/generated'

const selectors = {
  userName: 'create-user-input-user-name',
  displayName: 'create-user-input-display-name',
  email: 'create-user-input-email',
  password: 'create-user-input-password'
}

describe('CreateUserModal', () => {
  it('disables the confirm button initially', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.emitted('update:confirmDisabled').at(-1)).toEqual([true])
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
      getInput(wrapper, selectors.userName).vm.$emit('update:modelValue', 'ab')
      await setInput(wrapper, selectors.userName, '')
      rejectLookup(new Error(''))
      await flushPromises()
      expect(getInput(wrapper, selectors.userName).props('errorMessage')).toBe(
        'User name cannot be empty'
      )
      expect(wrapper.emitted('update:confirmDisabled').at(-1)).toEqual([true])
    })
    it.each([
      { userName: ' ', error: 'User name cannot be empty' },
      { userName: 'n'.repeat(256), error: 'User name cannot exceed 255 characters' },
      { userName: 'jan openCloud', error: 'User name cannot contain white spaces' },
      { userName: '1moretry', error: 'User name cannot start with a number' },
      { userName: 'jan(', error: 'User name cannot contain special characters' }
    ])('shows "$error" for "$userName"', async ({ userName, error }) => {
      const { wrapper } = getWrapper()
      await setInput(wrapper, selectors.userName, userName)
      expect(getInput(wrapper, selectors.userName).props('errorMessage')).toBe(error)
    })
    it('shows an error when the user already exists', async () => {
      const { wrapper, mocks } = getWrapper()
      const { getUser } = mocks.$clientService.graphAuthenticated.users
      getUser.mockResolvedValue(mock<User>({ onPremisesSamAccountName: 'jan' }))
      await setInput(wrapper, selectors.userName, 'jan')
      expect(getUser).toHaveBeenCalledWith('jan')
      expect(getInput(wrapper, selectors.userName).props('errorMessage')).toBe(
        'User "jan" already exists'
      )
    })
    it.each(['jana', 'sk@domain.tld'])('accepts "%s" as user name', async (userName) => {
      const { wrapper, mocks } = getWrapper()
      mocks.$clientService.graphAuthenticated.users.getUser.mockRejectedValue(new Error(''))
      await setInput(wrapper, selectors.userName, userName)
      expect(getInput(wrapper, selectors.userName).props('errorMessage')).toBe('')
    })
  })

  describe('display name validation', () => {
    it.each([
      { displayName: ' ', error: 'First and last name cannot be empty' },
      { displayName: 'n'.repeat(256), error: 'First and last name cannot exceed 255 characters' },
      { displayName: 'jana', error: '' }
    ])('shows "$error" for "$displayName"', async ({ displayName, error }) => {
      const { wrapper } = getWrapper()
      await setInput(wrapper, selectors.displayName, displayName)
      expect(getInput(wrapper, selectors.displayName).props('errorMessage')).toBe(error)
    })
  })

  describe('email validation', () => {
    it.each([
      { email: 'jana@', error: 'Please enter a valid email' },
      { email: 'jana@opencloud.eu', error: '' }
    ])('shows "$error" for "$email"', async ({ email, error }) => {
      const { wrapper } = getWrapper()
      await setInput(wrapper, selectors.email, email)
      expect(getInput(wrapper, selectors.email).props('errorMessage')).toBe(error)
    })
  })

  describe('password validation', () => {
    it.each([
      { password: ' ', error: 'Password cannot be empty' },
      { password: 'asecret', error: '' }
    ])('shows "$error" for "$password"', async ({ password, error }) => {
      const { wrapper } = getWrapper()
      await setInput(wrapper, selectors.password, password)
      expect(getInput(wrapper, selectors.password).props('errorMessage')).toBe(error)
    })
  })

  describe('onConfirm', () => {
    it('does not create a user if the form is invalid', async () => {
      const { wrapper, mocks } = getWrapper()
      await expect(wrapper.vm.onConfirm()).rejects.toBeUndefined()
      expect(mocks.$clientService.graphAuthenticated.users.createUser).not.toHaveBeenCalled()
    })
    it('enables the confirm button and creates the user when the form is valid', async () => {
      const { wrapper, mocks } = getWrapper()
      const { users } = mocks.$clientService.graphAuthenticated
      users.getUser.mockRejectedValueOnce(new Error(''))
      await fillForm(wrapper)
      expect(wrapper.emitted('update:confirmDisabled').at(-1)).toEqual([false])

      users.createUser.mockResolvedValue(mock<User>({ id: '1' }))
      users.getUser.mockResolvedValueOnce(mock<User>({ id: '1' }))
      await wrapper.vm.onConfirm()

      expect(users.createUser).toHaveBeenCalledWith({
        onPremisesSamAccountName: 'foo',
        displayName: 'foo bar',
        mail: 'foo@bar.com',
        passwordProfile: { password: 'asecret' }
      })
      const { upsertUser } = useUserSettingsStore()
      expect(upsertUser).toHaveBeenCalled()
      const { showMessage } = useMessages()
      expect(showMessage).toHaveBeenCalled()
    })
    it('shows an error message on failure', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { wrapper, mocks } = getWrapper()
      const { users } = mocks.$clientService.graphAuthenticated
      users.getUser.mockRejectedValue(new Error(''))
      await fillForm(wrapper)

      users.createUser.mockResolvedValue(mock<User>({ id: '1' }))
      await wrapper.vm.onConfirm()

      const { showErrorMessage } = useMessages()
      expect(showErrorMessage).toHaveBeenCalled()
      const { upsertUser } = useUserSettingsStore()
      expect(upsertUser).not.toHaveBeenCalled()
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

async function fillForm(wrapper: Wrapper) {
  await setInput(wrapper, selectors.userName, 'foo')
  await setInput(wrapper, selectors.displayName, 'foo bar')
  await setInput(wrapper, selectors.email, 'foo@bar.com')
  await setInput(wrapper, selectors.password, 'asecret')
}

function getWrapper() {
  const mocks = defaultComponentMocks()

  return {
    mocks,
    wrapper: shallowMount(CreateUserModal, {
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
