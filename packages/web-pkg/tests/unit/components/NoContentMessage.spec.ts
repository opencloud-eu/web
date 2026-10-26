import NoContentMessage from '../../../src/components/NoContentMessage.vue'
import { defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'

describe('NoContentMessage', () => {
  describe('icon prop', () => {
    it('should render the provided icon', () => {
      const { wrapper } = getWrapper()

      const iconEl = wrapper.find('oc-icon-stub')
      expect(iconEl.exists()).toBeTruthy()
      expect(iconEl.attributes().icon).toBe('mdi-test-icon')
    })
  })

  describe('image', () => {
    it('hides a decorative svg illustration from assistive technologies', () => {
      const { wrapper } = getWrapper({}, { imgSrc: 'empty.svg' })
      const image = wrapper.find('.no-content-message-image')
      expect(image.attributes('aria-hidden')).toBe('true')
      expect(image.attributes('alt')).toBeUndefined()
    })
    it('hides a decorative image illustration from assistive technologies', () => {
      const { wrapper } = getWrapper({}, { imgSrc: 'empty.png' })
      const image = wrapper.find('.no-content-message-image')
      expect(image.attributes('aria-hidden')).toBe('true')
      expect(image.attributes('alt')).toBe('')
    })
  })

  describe('named slots', () => {
    it('should render slot html for message', () => {
      const { wrapper } = getWrapper({
        message: `
        <p class="test message">This is a test message</p>
        `
      })
      const messageDiv = wrapper.findAll('.text-role-on-surface-variant').at(0)
      const slotEl = messageDiv.find('p')

      expect(messageDiv.exists()).toBeTruthy()
      expect(slotEl.exists()).toBeTruthy()
      expect(slotEl.attributes().class).toBe('test message')
      expect(slotEl.text()).toBe('This is a test message')
    })

    it('should render slot html for callToAction', () => {
      const { wrapper } = getWrapper({
        callToAction: `
        <button class="test action">Click here</button>
        `
      })
      const actionDiv = wrapper.findAll('.text-role-on-surface-variant').at(1)
      const slotEl = actionDiv.find('button')

      expect(slotEl.exists()).toBeTruthy()
      expect(slotEl.attributes().class).toBe('test action')
      expect(slotEl.text()).toBe('Click here')
    })
  })
})

function getWrapper(slots = {}, props = {}) {
  return {
    wrapper: shallowMount(NoContentMessage, {
      slots: slots,
      props: { icon: 'mdi-test-icon', ...props },
      global: {
        plugins: [...defaultPlugins()]
      }
    })
  }
}
