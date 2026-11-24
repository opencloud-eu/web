import { PasswordPolicyRuleId, PasswordPolicyService } from '../../../src/services'
import { createTestingPinia } from '@opencloud-eu/web-test-helpers'
import { Language } from 'vue3-gettext'
import { PasswordPolicyCapability } from '@opencloud-eu/web-client/ocs'
import { useCapabilityStore } from '../../../src/composables/piniaStores'
import { describe } from 'vitest'

describe('PasswordPolicyService', () => {
  it('works without a password policy capability, e.g. for anonymous visitors', () => {
    const { passwordPolicyService, store } = getWrapper(undefined)
    passwordPolicyService.initialize(store)

    expect(Object.keys(passwordPolicyService.getPolicy({ enforcePassword: true }).rules)).toEqual([
      'mustNotBeEmpty'
    ])
    expect(passwordPolicyService.generatePassword()).toHaveLength(12)
  })
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
        [{ max_characters: 72 } as PasswordPolicyCapability, ['atMostCharacters']],
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
    describe('excludeRules', () => {
      it('leaves out the excluded rules', () => {
        const { passwordPolicyService, store } = getWrapper({
          min_characters: 2,
          max_characters: 8
        } as PasswordPolicyCapability)
        passwordPolicyService.initialize(store)
        const policy = passwordPolicyService.getPolicy({
          excludeRules: [PasswordPolicyRuleId.atMostCharacters]
        })
        expect(Object.keys(policy.rules)).toEqual([PasswordPolicyRuleId.atLeastCharacters])
        expect(policy.check('a'.repeat(20))).toBeTruthy()
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
            { max_characters: 72 } as PasswordPolicyCapability,
            ['a'.repeat(72), 'a'.repeat(73), 'ä'.repeat(36), 'ä'.repeat(37)],
            false,
            [true, false, true, false]
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
  describe('method "missing"', () => {
    it.each([
      [{} as PasswordPolicyCapability, true, '', { mustNotBeEmpty: false }],
      [{} as PasswordPolicyCapability, true, 'o', { mustNotBeEmpty: true }],
      [{ min_characters: 3 }, false, 'ow', { atLeastCharacters: false }],
      [{ min_characters: 3 }, false, 'owl', { atLeastCharacters: true }],
      [{ max_characters: 3 }, false, 'owls', { atMostCharacters: false }],
      [{ max_characters: 3 }, false, 'owl', { atMostCharacters: true }],
      [{ min_uppercase_characters: 2 }, false, 'Owl', { atLeastUppercaseCharacters: false }],
      [{ min_uppercase_characters: 2 }, false, 'OWl', { atLeastUppercaseCharacters: true }],
      [{ min_lowercase_characters: 2 }, false, 'OWl', { atLeastLowercaseCharacters: false }],
      [{ min_lowercase_characters: 2 }, false, 'Owl', { atLeastLowercaseCharacters: true }],
      [{ min_digits: 2 }, false, 'owl1', { atLeastDigits: false }],
      [{ min_digits: 2 }, false, 'owl12', { atLeastDigits: true }],
      [{ min_special_characters: 2 }, false, 'owl!', { mustContain: false }],
      [{ min_special_characters: 2 }, false, 'owl!#', { mustContain: true }],
      [
        { min_characters: 4, min_digits: 1 },
        false,
        'owl1',
        { atLeastCharacters: true, atLeastDigits: true }
      ],
      [
        { min_characters: 4, min_digits: 1 },
        false,
        'owls',
        { atLeastCharacters: true, atLeastDigits: false }
      ]
    ])(
      'capability "%s", enforcePassword "%s", password "%s"',
      (
        capability: PasswordPolicyCapability,
        enforcePassword: boolean,
        password: string,
        expected: Record<string, boolean>
      ) => {
        const { passwordPolicyService, store } = getWrapper(capability)
        passwordPolicyService.initialize(store)
        const policy = passwordPolicyService.getPolicy({ enforcePassword })
        const result = policy.missing(password)

        expect(
          Object.fromEntries(result.rules.map(({ code, verified }) => [code, verified]))
        ).toEqual(expected)
        expect(policy.check(password)).toBe(Object.values(expected).every(Boolean))
      }
    )
    it('explains the rule with its message and format', () => {
      const { passwordPolicyService, store } = getWrapper({ min_special_characters: 2 })
      passwordPolicyService.initialize(store)

      expect(passwordPolicyService.getPolicy().missing('owl').rules).toEqual([
        {
          code: 'mustContain',
          message: '%{param1}+ special characters',
          helperMessage: expect.any(String),
          format: [2],
          verified: false
        }
      ])
    })
  })
  describe('method "check"', () => {
    it('rejects a non-string password', () => {
      const { passwordPolicyService, store } = getWrapper({} as PasswordPolicyCapability)
      passwordPolicyService.initialize(store)
      expect(passwordPolicyService.getPolicy().check(undefined)).toBe(false)
    })
  })
  describe('generating password', () => {
    it('does not exceed the maximum length', () => {
      const { passwordPolicyService, store } = getWrapper({ max_characters: 8 })
      passwordPolicyService.initialize(store)
      const generatedPw = passwordPolicyService.generatePassword()

      expect(generatedPw.length).toBe(8)
      expect(passwordPolicyService.getPolicy().check(generatedPw)).toBeTruthy()
    })
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
      language: { current: 'en', $gettext: (msg: string) => msg } as Language
    })
  }
}
