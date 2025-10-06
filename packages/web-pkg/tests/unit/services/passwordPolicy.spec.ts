import { PasswordPolicyService } from '../../../src/services'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'
import { Language } from 'vue3-gettext'
import { PasswordPolicyCapability } from '@opencloud-eu/web-client/ocs'
import { useCapabilityStore } from '../../../src/composables/piniaStores'
import { describe } from 'vitest'

describe('PasswordPolicyService', () => {
  describe('policy', () => {
    describe('mustNotBeEmpty rule', () => {
      it('is present when "enforcePassword" is set', () => {
        {
          const { passwordPolicyService, store } = getWrapper({} as PasswordPolicyCapability)
          passwordPolicyService.initialize(store)
          expect(
            Object.keys(passwordPolicyService.getPolicy({ enforcePassword: true }).rules)
          ).toEqual(['mustNotBeEmpty'])
        }
      })
      it('is not present when "enforcePassword" is set but other rules apply', () => {
        {
          const { passwordPolicyService, store } = getWrapper({
            min_characters: 2
          } as PasswordPolicyCapability)
          passwordPolicyService.initialize(store)
          expect(
            Object.keys(passwordPolicyService.getPolicy({ enforcePassword: true }).rules)
          ).toEqual(['atLeastCharacters'])
        }
      })
      it('is not present when "enforcePassword" is not set', () => {
        {
          const { passwordPolicyService, store } = getWrapper({} as PasswordPolicyCapability)
          passwordPolicyService.initialize(store)
          expect(Object.keys(passwordPolicyService.getPolicy({}).rules)).toEqual([])
        }
      })
    })
    describe('contains the rules according to the capability', () => {
      it.each([
        [{ min_characters: 2 } as PasswordPolicyCapability, ['atLeastCharacters']],
        [
          { min_lowercase_characters: 2 } as PasswordPolicyCapability,
          ['atLeastLowercaseCharacters']
        ],
        [
          { min_uppercase_characters: 2 } as PasswordPolicyCapability,
          ['atLeastUppercaseCharacters']
        ],
        [{ min_digits: 2 } as PasswordPolicyCapability, ['atLeastDigits']],
        [{ min_digits: 2 } as PasswordPolicyCapability, ['atLeastDigits']],
        [{ min_special_characters: 2 } as PasswordPolicyCapability, ['mustContain']],
        [
          {
            min_characters: 2,
            min_lowercase_characters: 2,
            min_uppercase_characters: 2,
            min_digits: 2,
            min_special_characters: 2
          } as PasswordPolicyCapability,
          [
            'atLeastCharacters',
            'atLeastUppercaseCharacters',
            'atLeastLowercaseCharacters',
            'atLeastDigits',
            'mustContain'
          ]
        ]
      ])('capability "%s"', (capability: PasswordPolicyCapability, expected: Array<string>) => {
        const { passwordPolicyService, store } = getWrapper(capability)
        passwordPolicyService.initialize(store)
        expect(Object.keys(passwordPolicyService.getPolicy().rules)).toEqual(expected)
      })
    })
    describe('method "check"', () => {
      describe('test the password correctly against te defined rules', () => {
        it.each([
          [{} as PasswordPolicyCapability, ['', 'o'], true, [false, true]],
          [{} as PasswordPolicyCapability, ['', 'o'], false, [true, true]],
          [
            { min_characters: 2 } as PasswordPolicyCapability,
            ['', 'o', 'ow', 'OpenCloud'],
            false,
            [false, false, true, true]
          ],
          [
            { min_lowercase_characters: 2 } as PasswordPolicyCapability,
            ['', 'o', 'oPENCLOUD', 'OpenCloud'],
            false,
            [false, false, false, true]
          ],
          [
            { min_uppercase_characters: 2 } as PasswordPolicyCapability,
            ['', 'o', 'opencloud', 'OpenCloud'],
            false,
            [false, false, false, true]
          ],
          [
            { min_digits: 2 } as PasswordPolicyCapability,
            ['', '1', 'OpenCloud1', 'OpenCloud12'],
            false,
            [false, false, false, true]
          ],
          [
            { min_special_characters: 2 } as PasswordPolicyCapability,
            ['', '!', 'OpenCloud!', 'OpenCloud!#'],
            false,
            [false, false, false, true]
          ],
          [
            {
              min_characters: 8,
              min_lowercase_characters: 2,
              min_uppercase_characters: 2,
              min_digits: 2,
              min_special_characters: 2,
              max_characters: 72
            } as PasswordPolicyCapability,
            ['OpenCloud', 'OpenCloudää', 'OpenCloudää12', 'OpenCloudÄ12#!'],
            false,
            [false, false, false, true]
          ]
        ])(
          'capability "%s, passwords "%s"',
          (
            capability: PasswordPolicyCapability,
            passwords: Array<string>,
            enforcePassword: boolean,
            expected: Array<boolean>
          ) => {
            const { passwordPolicyService, store } = getWrapper(capability)
            passwordPolicyService.initialize(store)
            const policy = passwordPolicyService.getPolicy({ enforcePassword })
            for (let i = 0; i < passwords.length; i++) {
              expect(policy.check(passwords[i])).toEqual(expected[i])
            }
          }
        )
      })
    })
  })
  describe('generating password', () => {
    it('generates a password that meets the policy requirements', () => {
      {
        const capability: PasswordPolicyCapability = {
          min_characters: 12,
          max_characters: 12,
          min_lowercase_characters: 2,
          min_uppercase_characters: 2,
          min_digits: 2,
          min_special_characters: 2
        }
        const { passwordPolicyService, store } = getWrapper(capability)
        passwordPolicyService.initialize(store)
        const generatedPw = passwordPolicyService.generatePassword()

        expect(generatedPw).toBeDefined()
        expect(generatedPw.length).toBe(12)

        const policy = passwordPolicyService.getPolicy()
        expect(policy.check(generatedPw)).toBeTruthy()
      }
    })
  })
})

const getWrapper = (capability: PasswordPolicyCapability) => {
  createTestingPinia()
  const store = useCapabilityStore()
  store.capabilities.password_policy = capability

  return {
    store,
    passwordPolicyService: new PasswordPolicyService({
      language: { current: 'en' } as Language
    })
  }
}
