import OcNotifications from './OcNotifications.vue'
import { shallowMount } from '@opencloud-eu/web-test-helpers'

describe('OcNotifications', () => {
  function getWrapper(options = {}) {
    return shallowMount(OcNotifications, options)
  }
  describe('position prop', () => {
    it.each([
      { position: 'top-left', expectedClasses: ['top-2', 'left-2'] },
      { position: 'top-center', expectedClasses: ['top-2', 'inset-x-0'] },
      { position: 'top-right', expectedClasses: ['top-2', 'right-2'] }
    ])('should set provided position as class for wrapper', ({ position, expectedClasses }) => {
      const wrapper = getWrapper({
        props: { position }
      })
      expectedClasses.forEach((expectedClass) => {
        expect(wrapper.attributes('class')).toContain(expectedClass)
      })
    })
  })

  it('should render provided slot html', () => {
    const wrapper = getWrapper({
      slots: {
        default:
          "<oc-notification-message title='test notification title' message='Testing is good.'/>"
      },
      global: {
        renderStubDefaultSlot: true,
        stubs: {
          OcNotificationMessage: true
        }
      }
    })
    const slotEl = wrapper.find('oc-notification-message-stub')
    expect(slotEl.exists()).toBeTruthy()
    expect(slotEl.attributes('title')).toBe('test notification title')
    expect(slotEl.attributes('message')).toBe('Testing is good.')
  })
})
