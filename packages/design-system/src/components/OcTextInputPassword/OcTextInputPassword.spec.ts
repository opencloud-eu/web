import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import OcTextInputPassword from './OcTextInputPassword.vue'
import { PasswordPolicy } from '../../helpers'
import { defineComponent, h } from 'vue'

const announceMock = vi.fn()
// exposes a spy as the announce method, so the tests can check what gets announced
const OcHiddenAnnouncerStub = defineComponent({
  setup(_, { expose }) {
    expose({ announce: announceMock })
    return () => h('span')
  }
})

describe('OcTextInputPassword', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    announceMock.mockReset()
  })
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
  it('announces each copy of the password to screen readers', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn() } })
    const wrapper = getWrapper('secret')

    await wrapper.find('.oc-text-input-copy-password-button').trigger('click')
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('secret')
    expect(announceMock).toHaveBeenCalledWith('Copied to clipboard!')

    await wrapper.find('.oc-text-input-copy-password-button').trigger('click')
    expect(announceMock).toHaveBeenCalledTimes(2)
  })
  it('uses the regular border when valid', () => {
    const wrapper = getWrapper('secret')
    const classes = wrapper.find('.oc-text-input-password-wrapper').classes()
    expect(classes).toContain('border-role-outline')
    expect(classes).not.toContain('border-role-error')
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
    global: {
      plugins: [...defaultPlugins()],
      stubs: { OcHiddenAnnouncer: OcHiddenAnnouncerStub }
    }
  })
}
