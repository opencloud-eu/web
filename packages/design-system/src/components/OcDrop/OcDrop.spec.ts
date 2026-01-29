import { defaultPlugins, mount, shallowMount } from '@opencloud-eu/web-test-helpers'
import Drop from './OcDrop.vue'
import { computed, nextTick } from 'vue'
import { useIsMobile } from '../../composables'

vi.mock('../../composables/useIsMobile')

const dom = ({
  position = 'auto',
  mode = 'click',
  paddingSize = 'medium',
  enforceDropOnMobile = false
} = {}) => {
  document.body.innerHTML = ''
  const wrapper = mount(
    {
      template:
        '<div><p id="trigger">trigger</p><oc-drop :position="position" :mode="mode" :padding-size="paddingSize" :enforce-drop-on-mobile="enforceDropOnMobile" toggle="#trigger">show</oc-drop></div>',
      components: { 'oc-drop': Drop }
    },
    {
      global: { plugins: defaultPlugins(), stubs: { OcMobileDrop: true } },
      attachTo: document.body,
      data: () => ({ position, mode, paddingSize, enforceDropOnMobile })
    }
  )

  return { wrapper }
}

describe('OcDrop', () => {
  beforeEach(() => {
    vi.mocked(useIsMobile).mockImplementation(() => ({
      isMobile: computed(() => false)
    }))
  })

  it('handles dropId prop', () => {
    for (let i = 0; i < 5; i++) {
      const wrapper = shallowMount(Drop)
      expect(wrapper.attributes().id).toBe(`oc-drop-${i + 1}`)
    }

    for (let i = 0; i < 5; i++) {
      const id = `custom-drop-id-${i}`
      const wrapper = shallowMount(Drop, {
        props: {
          dropId: id
        }
      })
      expect(wrapper.attributes().id).toBe(id)
    }
  })

  describe('tippy', () => {
    it('inits tippy', async () => {
      const { wrapper } = dom()
      await nextTick()

      const drop = wrapper.findComponent({ name: 'oc-drop' })
      const tippy = drop.vm.tippyInstance

      expect(tippy).toBeTruthy()
      expect(tippy.reference).toBe(wrapper.find('#trigger').element)
      expect(tippy.props.content).toBe(drop.vm.$refs.drop)
    })

    it('updates tippy', async () => {
      const { wrapper } = dom()

      await wrapper.setData({
        position: 'left',
        mode: 'hover'
      })

      const drop = wrapper.findComponent({ name: 'oc-drop' })
      const tippy = drop.vm.tippyInstance
      await nextTick()

      expect(tippy.props.placement).toBe('left')
      expect(tippy.props.trigger).toBe('mouseenter focus')
    })

    it('renders tippy', async () => {
      const { wrapper } = dom()
      await nextTick()
      const trigger = wrapper.find('#trigger')
      const wait = async () => {
        await wrapper.vm.$nextTick()
        return new Promise((resolve) => setTimeout(resolve, 100))
      }

      await trigger.trigger('click') // show
      await wait()
      expect(wrapper.findComponent(Drop).exists()).toBeTruthy()
      expect(trigger.attributes()['aria-expanded']).toBe('true')
      expect(wrapper.element).toMatchSnapshot()

      await trigger.trigger('click') // hide
      await wait()
      expect(trigger.attributes()['aria-expanded']).toBe('false')
      expect(wrapper.element).toMatchSnapshot()

      await wrapper.setData({
        mode: 'hover'
      })

      await trigger.trigger('mouseenter') // show
      await wait()
      expect(trigger.attributes()['aria-expanded']).toBe('true')
      expect(wrapper.element).toMatchSnapshot()
    })
  })

  describe('Component "OcMobileDrop"', () => {
    it('renders on mobile device', async () => {
      vi.mocked(useIsMobile).mockImplementation(() => ({
        isMobile: computed(() => true)
      }))

      const { wrapper } = dom()
      await nextTick()
      expect(wrapper.find('oc-mobile-drop-stub').exists()).toBeTruthy()
    })
    it('does not render on mobile device when "enforceDropOnMobile" is true', async () => {
      vi.mocked(useIsMobile).mockImplementation(() => ({
        isMobile: computed(() => true)
      }))

      const { wrapper } = dom({ enforceDropOnMobile: true })
      await nextTick()
      expect(wrapper.find('oc-mobile-drop-stub').exists()).toBeFalsy()
    })
  })
})
