import { shallowMount } from '@opencloud-eu/web-test-helpers'

import Switch from './OcSwitch.vue'

const defaultProps = {
  label: 'Test label'
}

describe('OcSwitch', () => {
  it('can be toggled', async () => {
    const wrapper = shallowMount(Switch, {
      props: defaultProps
    })

    await wrapper.find('[data-testid="oc-switch-btn"]').trigger('click')

    expect(wrapper.emitted('update:checked')[0][0]).toEqual(true)

    await wrapper.find('[data-testid="oc-switch-btn"]').trigger('click')

    expect(wrapper.emitted('update:checked')[0][0]).toEqual(true)
  })

  it('is not a submit button, so it does not hijack implicit form submission', () => {
    const wrapper = shallowMount(Switch, {
      props: defaultProps
    })

    expect(wrapper.find('[data-testid="oc-switch-btn"]').attributes('type')).toEqual('button')
  })

  it('does not toggle when disabled', async () => {
    const wrapper = shallowMount(Switch, {
      props: { ...defaultProps, disabled: true }
    })

    const btn = wrapper.find('[data-testid="oc-switch-btn"]')
    expect(btn.attributes('disabled')).toBeDefined()

    await btn.trigger('click')

    expect(wrapper.emitted('update:checked')).toBeUndefined()
  })
})
