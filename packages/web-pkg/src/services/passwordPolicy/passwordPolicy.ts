import { Language } from 'vue3-gettext'
import {
  AtLeastCharactersRule,
  AtLeastDigitsRule,
  AtLeastLowercaseCharactersRule,
  AtLeastUppercaseCharactersRule,
  MustContainRule,
  MustNotBeEmptyRule
} from './rules'
import { PasswordPolicyCapability } from '@opencloud-eu/web-client/ocs'
import { CapabilityStore } from '../../composables'

// @ts-ignore
import { PasswordPolicy } from 'password-sheriff'

interface GeneratePasswordRules {
  length: number
  minLowercaseCharacters: number
  minUppercaseCharacters: number
  minSpecialCharacters: number
  minDigits: number
}

export class PasswordPolicyService {
  private readonly language: Language
  private capability: PasswordPolicyCapability
  private policy: PasswordPolicy
  private generatePasswordRules: GeneratePasswordRules

  constructor({ language }: { language: Language }) {
    this.language = language
  }

  public initialize(capabilityStore: CapabilityStore) {
    this.capability = capabilityStore.passwordPolicy
    this.buildGeneratePasswordRules()
  }

  private hasRules(): boolean {
    return (
      !!this.capability.min_characters ||
      !!this.capability.min_lowercase_characters ||
      !!this.capability.min_uppercase_characters ||
      !!this.capability.min_digits ||
      !!this.capability.min_special_characters
    )
  }

  private buildGeneratePasswordRules(): void {
    const DEFAULT_LENGTH = 12
    const DEFAULT_MIN_LOWERCASE_CHARACTERS = 2
    const DEFAULT_MIN_UPPERCASE_CHARACTERS = 2
    const DEFAULT_MIN_SPECIAL_CHARACTERS = 2
    const DEFAULT_MIN_DIGITS = 2

    this.generatePasswordRules = {
      length: Math.max(
        this.capability.min_characters || 0,
        (this.capability.min_lowercase_characters || 0) +
          (this.capability.min_uppercase_characters || 0) +
          (this.capability.min_digits || 0) +
          (this.capability.min_special_characters || 0),
        DEFAULT_LENGTH
      ),
      minLowercaseCharacters: Math.max(
        this.capability.min_lowercase_characters || 0,
        DEFAULT_MIN_LOWERCASE_CHARACTERS
      ),
      minUppercaseCharacters: Math.max(
        this.capability.min_uppercase_characters || 0,
        DEFAULT_MIN_UPPERCASE_CHARACTERS
      ),
      minSpecialCharacters: Math.max(
        this.capability.min_special_characters || 0,
        DEFAULT_MIN_SPECIAL_CHARACTERS
      ),
      minDigits: Math.max(this.capability.min_digits || 0, DEFAULT_MIN_DIGITS)
    }
  }

  private buildPolicy({ enforcePassword = false } = {}): void {
    const ruleset = {
      atLeastCharacters: new AtLeastCharactersRule({ ...this.language }),
      mustNotBeEmpty: new MustNotBeEmptyRule({ ...this.language }),
      atLeastUppercaseCharacters: new AtLeastUppercaseCharactersRule({ ...this.language }),
      atLeastLowercaseCharacters: new AtLeastLowercaseCharactersRule({ ...this.language }),
      atLeastDigits: new AtLeastDigitsRule({ ...this.language }),
      mustContain: new MustContainRule({ ...this.language })
    }
    const rules = {} as Record<string, unknown>

    if (enforcePassword && !this.hasRules()) {
      rules.mustNotBeEmpty = {}
    }

    if (this.capability.min_characters) {
      rules.atLeastCharacters = { minLength: this.capability.min_characters }
    }

    if (this.capability.min_uppercase_characters) {
      rules.atLeastUppercaseCharacters = {
        minLength: this.capability.min_uppercase_characters
      }
    }

    if (this.capability.min_lowercase_characters) {
      rules.atLeastLowercaseCharacters = {
        minLength: this.capability.min_lowercase_characters
      }
    }

    if (this.capability.min_digits) {
      rules.atLeastDigits = { minLength: this.capability.min_digits }
    }

    if (this.capability.min_special_characters) {
      rules.mustContain = {
        minLength: this.capability.min_special_characters,
        characters: ' "!#\\$%&\'()*+,-./:;<=>?@[\\]^_`{|}~"'
      }
    }

    this.policy = new PasswordPolicy(rules, ruleset)
  }

  public getPolicy({ enforcePassword = false } = {}): PasswordPolicy {
    this.buildPolicy({ enforcePassword })
    return this.policy
  }

  public generatePassword(): string {
    const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz'
    const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const specialChars = '"!#$%&\'()*+,-./:;<=>?@[]^_`{|}~'
    const numberChars = '0123456789'

    const generateRandomChars = (chars: string, length: number) => {
      // inspired from https://blog.hboeck.de/archives/907-How-to-create-a-Secure,-Random-Password-with-JavaScript.html
      const limit = 256 - (256 % chars.length)
      let result = ''
      let randval: number
      for (let i = 0; i < length; i++) {
        do {
          randval = window.crypto.getRandomValues(new Uint8Array(1))[0]
        } while (randval >= limit)
        result += chars[randval % chars.length]
      }
      return result
    }

    const {
      minLowercaseCharacters,
      minUppercaseCharacters,
      minDigits,
      minSpecialCharacters,
      length
    } = this.generatePasswordRules

    let password = ''
    password += generateRandomChars(lowercaseChars, minLowercaseCharacters)
    password += generateRandomChars(uppercaseChars, minUppercaseCharacters)
    password += generateRandomChars(numberChars, minDigits)
    password += generateRandomChars(specialChars, minSpecialCharacters)

    if (password.length < length) {
      // fill the remaining length with a random selection of all characters
      const remainingLength = length - password.length
      const allChars = lowercaseChars + uppercaseChars + specialChars + numberChars
      password += generateRandomChars(allChars, remainingLength)
    }

    const shuffleChars = (str: string) => {
      const arr = str.split('')
      const randomValues = new Uint32Array(arr.length)
      window.crypto.getRandomValues(randomValues)

      for (let i = arr.length - 1; i > 0; i--) {
        const j = randomValues[i] % (i + 1)
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
      }

      return arr.join('')
    }

    return shuffleChars(password)
  }
}
