import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import OcTextInputPassword from './OcTextInputPassword.vue'
import { PasswordPolicy } from '../../helpers'

describe('OcTextInputPassword', () => {
  it('shows the initial value', () => {
    const wrapper = getWrapper('secret')
    expect(wrapper.find('input').element.value).toBe('secret')
  })
  it('updates the input when the value changes from outside', async () => {
    const wrapper = getWrapper('secret')
    await wrapper.setProps({ value: '' })
    expect(wrapper.find('input').element.value).toBe('')
  })
  it.each([false, true])('shows the error border when invalid (focused: %s)', async (focused) => {
    const wrapper = getWrapper('secret', { hasError: true })
    if (focused) {
      await wrapper.find('input').trigger('focus')
    }
    const classes = wrapper.find('.oc-text-input-password-wrapper').classes()
    expect(classes).toContain('border-role-error')
    expect(classes).not.toContain('border-role-outline')
    if (focused) {
      expect(classes).toContain('outline-role-secondary')
    }
  })
  it('uses the regular border when valid', () => {
    const wrapper = getWrapper('secret')
    const classes = wrapper.find('.oc-text-input-password-wrapper').classes()
    expect(classes).toContain('border-role-outline')
    expect(classes).not.toContain('border-role-error')
  })
  describe('password policy', () => {
    function getPolicyWrapper(value: string, verified: boolean, attrs = {}) {
      const policy: PasswordPolicy = {
        rules: [{}],
        check: () => verified,
        missing: () => ({
          rules: [{ code: 'minLength', message: '%{param1}+ letters', format: [8], verified }]
        })
      }
      return mount(OcTextInputPassword, {
        props: { value, passwordPolicy: policy, teleportId: 'policy-rules' },
        attrs,
        global: { plugins: [...defaultPlugins()], stubs: { Teleport: true } }
      })
    }

    it('describes the input with the policy rules and their state', () => {
      const wrapper = getPolicyWrapper('ab', false, { 'aria-describedby': 'message-id' })
      expect(wrapper.find('input').attributes('aria-describedby')).toBe('message-id policy-rules')
      expect(wrapper.find('.oc-text-input-password-policy-rule .sr-only').text()).toBe(
        'Requirement not met'
      )
    })
    it('keeps the policy rules when the described-by attribute changes', async () => {
      const wrapper = getPolicyWrapper('ab', false)
      expect(wrapper.find('input').attributes('aria-describedby')).toBe('policy-rules')
      await wrapper.setProps({ 'aria-describedby': 'message-id' } as any)
      expect(wrapper.find('input').attributes('aria-describedby')).toBe('message-id policy-rules')
    })
    it('announces a met rule', () => {
      const wrapper = getPolicyWrapper('abcdefghij', true)
      expect(wrapper.find('.oc-text-input-password-policy-rule .sr-only').text()).toBe(
        'Requirement met'
      )
      expect(wrapper.find('input').attributes('aria-invalid')).not.toBe('true')
    })
    it('marks the input invalid while a rule fails', () => {
      const wrapper = getPolicyWrapper('ab', false, { 'aria-invalid': 'false' })
      expect(wrapper.find('input').attributes('aria-invalid')).toBe('true')
    })
    it('does not mark an empty input invalid', () => {
      const wrapper = getPolicyWrapper('', false, { 'aria-invalid': 'false' })
      expect(wrapper.find('input').attributes('aria-invalid')).toBe('false')
    })
  })
})

const passwordPolicy: PasswordPolicy = {
  rules: [],
  check: () => true,
  missing: () => ({ rules: [] })
}

function getWrapper(value: string, props: { hasError?: boolean } = {}) {
  return mount(OcTextInputPassword, {
    props: { value, passwordPolicy, ...props },
    global: { plugins: [...defaultPlugins()] }
  })
}
