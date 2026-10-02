import { mount, PartialComponentProps } from '@opencloud-eu/web-test-helpers'
import OcIcon from './OcIcon.vue'

describe('OcIcon', () => {
  describe('type', () => {
    it.each(['span', 'div'])('renders the icon based in its type', (type) => {
      const { wrapper } = getWrapper({ type })
      expect(wrapper.find(type).exists()).toBe(true)
    })
    it('should apply bg-transparent and min-h-0 class when type is button', () => {
      const { wrapper } = getWrapper({ type: 'button' })
      expect(wrapper.find('button').classes()).toContain('bg-transparent')
      expect(wrapper.find('button').classes()).toContain('min-h-0')
    })
  })
  describe('text direction', () => {
    it.each(['arrow-left-s', 'arrow-right', 'arrow-drop-right', 'arrow-go-back', 'share-forward'])(
      'mirrors the directional icon "%s" in right-to-left layouts',
      (name) => {
        const { wrapper } = getWrapper({ name })
        expect(wrapper.find('span').classes()).toContain('rtl:-scale-x-100')
      }
    )
    it.each(['info', 'arrow-up-s', 'align-left'])(
      'does not mirror the icon "%s" in right-to-left layouts',
      (name) => {
        const { wrapper } = getWrapper({ name })
        expect(wrapper.find('span').classes()).not.toContain('rtl:-scale-x-100')
      }
    )
  })
  describe('src', () => {
    it('should use the provided name to render the correct fill svg icon', () => {
      const { wrapper } = getWrapper({ name: 'settings' })
      const inlineSvg = wrapper.findComponent({ name: 'inline-svg' })
      expect(inlineSvg.exists()).toBe(true)
      expect(inlineSvg.attributes('src')).toEqual('icons/settings-fill.svg')
    })
    it('should use the provided name to render the correct line svg icon', () => {
      const { wrapper } = getWrapper({ name: 'settings', fillType: 'line' })
      const inlineSvg = wrapper.findComponent({ name: 'inline-svg' })
      expect(inlineSvg.exists()).toBe(true)
      expect(inlineSvg.attributes('src')).toEqual('icons/settings-line.svg')
    })
  })
  it('should emit the loaded event when the svg is being loaded', async () => {
    const { wrapper } = getWrapper()
    const inlineSvg = wrapper.findComponent({ name: 'inline-svg' })

    await inlineSvg.vm.$emit('loaded')

    expect(wrapper.emitted('loaded')).toBeTruthy()
    expect(wrapper.emitted('loaded')).toHaveLength(1)
  })
})

const getWrapper = (props: PartialComponentProps<typeof OcIcon> = {}) => {
  return {
    wrapper: mount(OcIcon, {
      props: {
        ...props
      }
    })
  }
}
