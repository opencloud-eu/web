import { defaultPlugins, mount, shallowMount } from '@opencloud-eu/web-test-helpers'
import Drop from './OcDrop.vue'
import { computed, nextTick } from 'vue'
import { useIsMobile } from '../../composables'
import { computePosition, ComputePositionReturn } from '@floating-ui/dom'
import { flushPromises } from '@vue/test-utils'

vi.mock('../../composables/useIsMobile')
vi.mock('@floating-ui/dom', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  computePosition: vi.fn(() => ({}))
}))

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

  it('handles dropId prop', async () => {
    for (let i = 0; i < 5; i++) {
      const wrapper = shallowMount(Drop)
      wrapper.vm.show()
      await nextTick()
      expect(wrapper.find('div').attributes().id).toBe(`oc-drop-${i + 1}`)
    }

    for (let i = 0; i < 5; i++) {
      const id = `custom-drop-id-${i}`
      const wrapper = shallowMount(Drop, {
        props: {
          dropId: id
        }
      })
      wrapper.vm.show()
      await nextTick()
      expect(wrapper.find('div').attributes().id).toBe(id)
    }
  })

  describe('floating UI', () => {
    it('applies the calculated position values for the drop', async () => {
      vi.useFakeTimers()
      vi.mocked(computePosition).mockResolvedValue({ x: 2, y: 3 } as ComputePositionReturn)
      const { wrapper } = dom()
      const drop = wrapper.findComponent({ name: 'oc-drop' })
      drop.vm.show()
      await nextTick()
      expect(wrapper.find('.oc-card').exists()).toBeTruthy()
      vi.runAllTimers()
      await flushPromises()
      expect(wrapper.find('.oc-drop').attributes('style')).toContain('left: 2px;')
      expect(wrapper.find('.oc-drop').attributes('style')).toContain('top: 3px;')
    })
    describe('mode', () => {
      it('registers a click handler on the anchor in click mode', async () => {
        vi.useFakeTimers()
        vi.mocked(computePosition).mockResolvedValue({ x: 0, y: 0 } as ComputePositionReturn)
        const { wrapper } = dom({ mode: 'click' })
        await wrapper.find('#trigger').trigger('click')
        vi.runAllTimers()
        await flushPromises()
        expect(wrapper.find('.oc-drop').exists()).toBeTruthy()
      })
      it('registers a mouseenter and /-leave handlers on the anchor in hover mode', async () => {
        vi.useFakeTimers()
        vi.mocked(computePosition).mockResolvedValue({ x: 0, y: 0 } as ComputePositionReturn)
        const { wrapper } = dom({ mode: 'hover' })
        const trigger = wrapper.find('#trigger')

        await trigger.trigger('mouseenter')
        vi.runAllTimers()
        await flushPromises()
        expect(wrapper.find('.oc-drop').exists()).toBeTruthy()

        await trigger.trigger('mouseleave')
        vi.runAllTimers()
        await flushPromises()
        expect(wrapper.find('.oc-drop').exists()).toBeFalsy()
      })
      it('does not register any event handler on the anchor in manual mode', async () => {
        vi.useFakeTimers()
        vi.mocked(computePosition).mockResolvedValue({ x: 0, y: 0 } as ComputePositionReturn)
        const { wrapper } = dom({ mode: 'manual' })
        await wrapper.find('#trigger').trigger('click')
        vi.runAllTimers()
        await flushPromises()
        expect(wrapper.find('.oc-drop').exists()).toBeFalsy()
      })
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
