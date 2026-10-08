import { mount, PartialComponentProps } from '@opencloud-eu/web-test-helpers'
import OcApplicationIcon from './OcApplicationIcon.vue'

describe('OcApplicationIcon', () => {
  describe('named icon', () => {
    it('renders the icon on a tile in the primary color', () => {
      const { wrapper } = getWrapper({ icon: 'settings', colorPrimary: '#ff0000' })
      expect(wrapper.attributes('style')).toContain('background: #ff0000')
      expect(wrapper.findComponent({ name: 'inline-svg' }).attributes('src')).toEqual(
        'icons/settings-fill.svg'
      )
    })
    it('renders the icon on a tile in a generated color when there is no primary color', () => {
      const { wrapper } = getWrapper({ icon: 'settings' })
      expect(wrapper.attributes('style')).toContain('background:')
    })
    it('accepts a named icon object', () => {
      const { wrapper } = getWrapper({ icon: { name: 'settings', fillType: 'line' } })
      expect(wrapper.attributes('style')).toEqual(
        getWrapper({ icon: 'settings' }).wrapper.attributes('style')
      )
      expect(wrapper.findComponent({ name: 'inline-svg' }).attributes('src')).toEqual(
        'icons/settings-line.svg'
      )
    })
  })
  describe('image icon', () => {
    it('fills the tile and has no background when there is no primary color', () => {
      const { wrapper } = getWrapper({ icon: { src: 'logo.png' } })
      expect(wrapper.attributes('style')).toBeUndefined()
      expect(wrapper.classes()).toContain('overflow-hidden')
      expect(wrapper.find('img').attributes('src')).toEqual('logo.png')
      expect(wrapper.find('img').classes()).toContain('size-8')
    })
    it('sits in icon size on a tile in the primary color', () => {
      const { wrapper } = getWrapper({ icon: { src: 'logo.png' }, colorPrimary: '#ff0000' })
      expect(wrapper.attributes('style')).toContain('background: #ff0000')
      expect(wrapper.find('img').classes()).toContain('size-5')
    })
  })
})

function getWrapper(props: PartialComponentProps<typeof OcApplicationIcon> = {}) {
  return {
    wrapper: mount(OcApplicationIcon, {
      props: {
        icon: 'settings',
        ...props
      }
    })
  }
}
