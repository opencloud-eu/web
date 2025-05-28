import { defaultPlugins, shallowMount } from '@opencloud-eu/web-test-helpers'
import Recipient from './OcRecipient.vue'
import { Recipient as RecipientType } from '../../helpers'

describe('OcRecipient', () => {
  function getWrapper(
    props: Partial<RecipientType> = undefined,
    avatarSlot: string = undefined,
    appendSlot: string = undefined
  ) {
    const slots: { append?: string; avatar?: string } = {}
    if (appendSlot) {
      slots.append = appendSlot
    }
    if (avatarSlot) {
      slots.avatar = avatarSlot
    }

    return shallowMount(Recipient, {
      props: {
        recipient: {
          name: 'alice',
          avatar: 'avatar.jpg',
          hasAvatar: true,
          icon: { name: 'user', label: 'User' },
          ...props
        }
      },
      slots,
      global: { plugins: [...defaultPlugins()] }
    })
  }

  it('displays recipient name', () => {
    const wrapper = getWrapper()

    expect(wrapper.find('[data-testid="recipient-name"]').text()).toEqual('alice')
  })

  it('displays avatar', () => {
    const wrapper = getWrapper()

    expect(wrapper.find('oc-avatar-item-stub').attributes('icon')).toEqual('user')
  })

  it('display content in the avatar slot', () => {
    const wrapper = getWrapper({}, '<span id="avatar-slot">Hello world</span>')

    expect(wrapper.find('#avatar-slot').exists()).toBeTruthy()
  })

  it('display content in the append slot', () => {
    const wrapper = getWrapper({}, '', '<span id="append-slot"> Hello world </span>')

    expect(wrapper.find('#append-slot').exists()).toBeTruthy()
  })
})
