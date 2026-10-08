import { mount, PartialComponentProps } from '@opencloud-eu/web-test-helpers'
import { nextTick, ref, Ref } from 'vue'
import OcIcon from './OcIcon.vue'
import { iconIsDarkInjectionKey } from '../../helpers'

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
  describe('named icon', () => {
    it('renders an icon name given as a string', () => {
      const { wrapper } = getWrapper({ icon: 'settings' })
      const inlineSvg = wrapper.findComponent({ name: 'inline-svg' })
      expect(inlineSvg.attributes('src')).toEqual('icons/settings-fill.svg')
    })
    it('prefers the icon over the name', () => {
      const { wrapper } = getWrapper({ icon: 'settings', name: 'close' })
      const inlineSvg = wrapper.findComponent({ name: 'inline-svg' })
      expect(inlineSvg.attributes('src')).toEqual('icons/settings-fill.svg')
    })
    it('prefers the fill type and color of a named icon over the props', () => {
      const { wrapper } = getWrapper({
        icon: { name: 'settings', fillType: 'line', color: 'red' },
        fillType: 'fill',
        color: 'blue'
      })
      const inlineSvg = wrapper.findComponent({ name: 'inline-svg' })
      expect(inlineSvg.attributes('src')).toEqual('icons/settings-line.svg')
      expect(inlineSvg.attributes('style')).toContain('fill: red')
    })
    it('falls back to the fill type and color props for a named icon', () => {
      const { wrapper } = getWrapper({
        icon: { name: 'settings' },
        fillType: 'line',
        color: 'blue'
      })
      const inlineSvg = wrapper.findComponent({ name: 'inline-svg' })
      expect(inlineSvg.attributes('src')).toEqual('icons/settings-line.svg')
      expect(inlineSvg.attributes('style')).toContain('fill: blue')
    })
  })
  describe('dark variant', () => {
    it('renders the dark variant of an icon that has one when the dark state is active', () => {
      const { wrapper } = getWrapper({ icon: 'resource-type-pdf' }, { isDark: ref(true) })
      const inlineSvg = wrapper.findComponent({ name: 'inline-svg' })
      expect(inlineSvg.attributes('src')).toEqual('icons/resource-type-pdf-dark-fill.svg')
    })
    it('renders the regular icon when the dark state is not active', () => {
      const { wrapper } = getWrapper({ icon: 'resource-type-pdf' })
      const inlineSvg = wrapper.findComponent({ name: 'inline-svg' })
      expect(inlineSvg.attributes('src')).toEqual('icons/resource-type-pdf-fill.svg')
    })
    it('renders the regular icon in dark state for an icon without dark variant', () => {
      const { wrapper } = getWrapper({ icon: 'settings' }, { isDark: ref(true) })
      const inlineSvg = wrapper.findComponent({ name: 'inline-svg' })
      expect(inlineSvg.attributes('src')).toEqual('icons/settings-fill.svg')
    })
    it('renders the regular icon in dark state for another fill type than fill', () => {
      const { wrapper } = getWrapper(
        { icon: 'resource-type-pdf', fillType: 'line' },
        { isDark: ref(true) }
      )
      const inlineSvg = wrapper.findComponent({ name: 'inline-svg' })
      expect(inlineSvg.attributes('src')).toEqual('icons/resource-type-pdf-line.svg')
    })
  })
  describe('image icon', () => {
    it('renders an image instead of an inline svg', () => {
      const { wrapper } = getWrapper({ icon: { src: 'https://example.org/logo.png' } })
      expect(wrapper.findComponent({ name: 'inline-svg' }).exists()).toBe(false)
      expect(wrapper.find('img').attributes('src')).toEqual('https://example.org/logo.png')
    })
    it('ignores the color and fill type props', () => {
      const { wrapper } = getWrapper({
        icon: { src: 'https://example.org/logo.png' },
        color: 'red',
        fillType: 'line'
      })
      expect(wrapper.find('img').attributes('src')).toEqual('https://example.org/logo.png')
      expect(wrapper.find('img').attributes('style')).toBeUndefined()
    })
    it('renders the light source when no dark state is provided', () => {
      const { wrapper } = getWrapper({ icon: { src: 'light.png', srcDark: 'dark.png' } })
      expect(wrapper.find('img').attributes('src')).toEqual('light.png')
    })
    it('renders the dark source when the provided dark state is active', () => {
      const { wrapper } = getWrapper(
        { icon: { src: 'light.png', srcDark: 'dark.png' } },
        { isDark: ref(true) }
      )
      expect(wrapper.find('img').attributes('src')).toEqual('dark.png')
    })
    it('renders the light source in dark state when there is no dark source', () => {
      const { wrapper } = getWrapper({ icon: { src: 'light.png' } }, { isDark: ref(true) })
      expect(wrapper.find('img').attributes('src')).toEqual('light.png')
    })
    it('renders the dark source when the provided dark state is a getter', () => {
      const { wrapper } = getWrapper(
        { icon: { src: 'light.png', srcDark: 'dark.png' } },
        { isDark: () => true }
      )
      expect(wrapper.find('img').attributes('src')).toEqual('dark.png')
    })
    it('renders an image and no named icon for an empty source', () => {
      const { wrapper } = getWrapper({ icon: { src: '' } })
      expect(wrapper.findComponent({ name: 'inline-svg' }).exists()).toBe(false)
      expect(wrapper.find('img').exists()).toBe(true)
    })
    it('follows changes of the provided dark state', async () => {
      const isDark = ref(false)
      const { wrapper } = getWrapper(
        { icon: { src: 'light.png', srcDark: 'dark.png' } },
        { isDark }
      )
      isDark.value = true
      await nextTick()
      expect(wrapper.find('img').attributes('src')).toEqual('dark.png')
    })
    it('is decorative without an accessible label', () => {
      const { wrapper } = getWrapper({ icon: { src: 'logo.png' } })
      expect(wrapper.find('img').attributes('alt')).toEqual('')
      expect(wrapper.find('img').attributes('aria-hidden')).toEqual('true')
    })
    it('uses the accessible label as alternative text', () => {
      const { wrapper } = getWrapper({ icon: { src: 'logo.png' }, accessibleLabel: 'Draw.io' })
      expect(wrapper.find('img').attributes('alt')).toEqual('Draw.io')
      expect(wrapper.find('img').attributes('aria-hidden')).toBeUndefined()
    })
    it('emits the loaded event when the image is being loaded', async () => {
      const { wrapper } = getWrapper({ icon: { src: 'logo.png' } })
      await wrapper.find('img').trigger('load')
      expect(wrapper.emitted('loaded')).toHaveLength(1)
    })
    it('emits the error event and hides the image when it fails to load', async () => {
      const { wrapper } = getWrapper({ icon: { src: 'logo.png' } })
      expect(wrapper.find('img').classes()).not.toContain('opacity-0')
      await wrapper.find('img').trigger('error')
      expect(wrapper.emitted('error')).toHaveLength(1)
      expect(wrapper.find('img').classes()).toContain('opacity-0')
    })
    it('shows the image again when the source changes after a failure', async () => {
      const { wrapper } = getWrapper({ icon: { src: 'broken.png' } })
      await wrapper.find('img').trigger('error')
      await wrapper.setProps({ icon: { src: 'logo.png' } })
      expect(wrapper.find('img').classes()).not.toContain('opacity-0')
    })
  })
  it('should emit the loaded event when the svg is being loaded', async () => {
    const { wrapper } = getWrapper()
    const inlineSvg = wrapper.findComponent({ name: 'inline-svg' })

    await inlineSvg.vm.$emit('loaded')

    expect(wrapper.emitted('loaded')).toBeTruthy()
    expect(wrapper.emitted('loaded')).toHaveLength(1)
  })
  it('should emit the error event when the svg could not be loaded', async () => {
    const { wrapper } = getWrapper()
    const inlineSvg = wrapper.findComponent({ name: 'inline-svg' })

    await inlineSvg.vm.$emit('error', new Error('not found'))

    expect(wrapper.emitted('error')).toHaveLength(1)
  })
})

const getWrapper = (
  props: PartialComponentProps<typeof OcIcon> = {},
  { isDark }: { isDark?: Ref<boolean> | (() => boolean) } = {}
) => {
  return {
    wrapper: mount(OcIcon, {
      props: {
        ...props
      },
      global: {
        provide: isDark ? { [iconIsDarkInjectionKey]: isDark } : {}
      }
    })
  }
}
