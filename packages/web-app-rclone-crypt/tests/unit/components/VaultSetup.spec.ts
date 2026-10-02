import { mock } from 'vitest-mock-extended'
import { PasswordPolicyService } from '@opencloud-eu/web-pkg'
import { defaultComponentMocks, defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import VaultSetup from '../../../src/components/VaultSetup.vue'

describe('VaultSetup', () => {
  it('uses the password policy and the password generator for the password input', () => {
    const { wrapper, mocks, passwordPolicy } = getWrapper()
    const input = wrapper.findComponent<any>({ name: 'OcTextInput' })
    expect(mocks.$passwordPolicyService.getPolicy).toHaveBeenCalledWith({ enforcePassword: true })
    expect(input.props('passwordPolicy')).toBe(passwordPolicy)

    mocks.$passwordPolicyService.generatePassword.mockReturnValue('generated-password')
    expect(input.props('generatePasswordMethod')()).toBe('generated-password')
  })
  it.each([true, false])(
    'is only valid if the password fulfills the policy (%s)',
    async (fulfilled) => {
      const { wrapper, passwordPolicy } = getWrapper()
      passwordPolicy.check.mockReturnValue(fulfilled)
      await wrapper.setProps({ modelValue: 'secret' })
      expect(passwordPolicy.check).toHaveBeenLastCalledWith('secret')
      expect(wrapper.emitted('update:valid').at(-1)).toEqual([fulfilled])
    }
  )
})

function getWrapper() {
  const mocks = defaultComponentMocks()
  const passwordPolicy = mock<ReturnType<PasswordPolicyService['getPolicy']>>()
  passwordPolicy.check.mockReturnValue(false)
  passwordPolicy.missing.mockReturnValue({ rules: [], verified: false })
  mocks.$passwordPolicyService.getPolicy.mockReturnValue(passwordPolicy)

  return {
    mocks,
    passwordPolicy,
    wrapper: mount(VaultSetup, {
      props: { vaultName: 'Project archive.vault' },
      global: { plugins: [...defaultPlugins()], mocks, provide: mocks }
    })
  }
}
