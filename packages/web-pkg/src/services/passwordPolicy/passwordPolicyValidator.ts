import type { PasswordPolicy } from '@opencloud-eu/design-system/helpers'
import { PasswordPolicyRule, PasswordPolicyRuleExplained, PasswordPolicyRuleOptions } from './rules'

type PasswordPolicyRules = Record<string, PasswordPolicyRuleOptions>

type VerifiedRule = PasswordPolicyRuleExplained & { verified: boolean }

export class PasswordPolicyValidator implements PasswordPolicy {
  readonly rules: PasswordPolicyRules
  private readonly ruleset: Record<string, PasswordPolicyRule>

  constructor(rules: PasswordPolicyRules, ruleset: Record<string, PasswordPolicyRule>) {
    this.rules = rules
    this.ruleset = ruleset

    for (const [ruleId, options] of Object.entries(rules)) {
      ruleset[ruleId].validate(options)
    }
  }

  check(password: string): boolean {
    if (typeof password !== 'string') {
      return false
    }

    return Object.entries(this.rules).every(([ruleId, options]) =>
      this.ruleset[ruleId].assert(options, password)
    )
  }

  missing(password: string): { rules: VerifiedRule[]; verified: boolean } {
    const rules = Object.entries(this.rules).map(([ruleId, options]) => {
      const rule = this.ruleset[ruleId].missing(options, password)
      return { ...rule, verified: !!rule.verified }
    })
    return { rules, verified: rules.every(({ verified }) => verified) }
  }
}
