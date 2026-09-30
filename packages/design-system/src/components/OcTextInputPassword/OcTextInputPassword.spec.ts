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
})

const passwordPolicy: PasswordPolicy = {
  rules: [],
  check: () => true,
  missing: () => ({ rules: [] })
}

function getWrapper(value: string) {
  return mount(OcTextInputPassword, {
    props: { value, passwordPolicy },
    global: { plugins: [...defaultPlugins()] }
  })
}
