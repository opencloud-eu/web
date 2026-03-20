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
      const wrapper = shallowMount(Drop, { global: { stubs: { teleport: false } } })
      wrapper.vm.show()
      await nextTick()
      expect(wrapper.find('div').attributes().id).toBe(`oc-drop-${i + 1}`)
    }

    for (let i = 0; i < 5; i++) {
      const id = `custom-drop-id-${i}`
      const wrapper = shallowMount(Drop, {
        props: { dropId: id },
        global: { stubs: { teleport: false } }
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
    it('renders on mobile device without a toggle selector', async () => {
      vi.mocked(useIsMobile).mockImplementation(() => ({
        isMobile: computed(() => true)
      }))

      const wrapper = shallowMount(Drop, {
        props: { mode: 'manual' },
        global: { plugins: defaultPlugins(), stubs: { OcMobileDrop: true } }
      })
      await nextTick()
      expect(wrapper.find('oc-mobile-drop-stub').exists()).toBeTruthy()
    })
  })

  describe('anchor prop', () => {
    it('uses a virtual element (no HTMLElement) for positioning and skips aria-expanded writes', async () => {
      vi.useFakeTimers()
      vi.mocked(computePosition).mockResolvedValue({ x: 10, y: 20 } as ComputePositionReturn)
      const rect = {
        width: 0,
        height: 0,
        x: 100,
        y: 100,
        top: 100,
        left: 100,
        right: 100,
        bottom: 100
      } as DOMRect
      const virtualAnchor = { getBoundingClientRect: () => rect }
      const wrapper = shallowMount(Drop, {
        props: { mode: 'manual', anchor: virtualAnchor },
        global: { plugins: defaultPlugins(), stubs: { teleport: false } },
        attachTo: document.body
      })
      wrapper.vm.show()
      await nextTick()
      vi.runAllTimers()
      await flushPromises()
      expect(wrapper.find('.oc-drop').attributes('style')).toContain('left: 10px;')
      expect(wrapper.find('.oc-drop').attributes('style')).toContain('top: 20px;')
      const passedAnchor = vi.mocked(computePosition).mock.calls[0][0] as {
        getBoundingClientRect: () => DOMRect
      }
      expect(passedAnchor.getBoundingClientRect()).toBe(rect)
    })

    it('uses an HTMLElement passed directly', async () => {
      vi.useFakeTimers()
      vi.mocked(computePosition).mockResolvedValue({ x: 1, y: 2 } as ComputePositionReturn)
      const el = document.createElement('button')
      document.body.appendChild(el)
      const wrapper = shallowMount(Drop, {
        props: { mode: 'manual', anchor: el },
        global: { plugins: defaultPlugins(), stubs: { teleport: false } },
        attachTo: document.body
      })
      wrapper.vm.show()
      await nextTick()
      vi.runAllTimers()
      await flushPromises()
      expect(vi.mocked(computePosition).mock.calls.at(-1)?.[0]).toBe(el)
    })

    it('accepts a getter function resolving to the anchor', async () => {
      vi.useFakeTimers()
      vi.mocked(computePosition).mockResolvedValue({ x: 5, y: 6 } as ComputePositionReturn)
      const rect = {
        width: 0,
        height: 0,
        x: 50,
        y: 50,
        top: 50,
        left: 50,
        right: 50,
        bottom: 50
      } as DOMRect
      const virtualAnchor = { getBoundingClientRect: () => rect }
      const wrapper = shallowMount(Drop, {
        props: { mode: 'manual', anchor: () => virtualAnchor },
        global: { plugins: defaultPlugins(), stubs: { teleport: false } },
        attachTo: document.body
      })
      wrapper.vm.show()
      await nextTick()
      vi.runAllTimers()
      await flushPromises()
      const passedAnchor = vi.mocked(computePosition).mock.calls.at(-1)?.[0] as {
        getBoundingClientRect: () => DOMRect
      }
      expect(passedAnchor.getBoundingClientRect()).toBe(rect)
    })

    it('prefers anchor prop over toggle selector', async () => {
      vi.useFakeTimers()
      vi.mocked(computePosition).mockResolvedValue({ x: 0, y: 0 } as ComputePositionReturn)
      document.body.innerHTML = '<p id="trigger">x</p>'
      const rect = {
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      } as DOMRect
      const virtualAnchor = { getBoundingClientRect: () => rect }
      const wrapper = shallowMount(Drop, {
        props: { mode: 'manual', toggle: '#trigger', anchor: virtualAnchor },
        global: { plugins: defaultPlugins(), stubs: { teleport: false } },
        attachTo: document.body
      })
      wrapper.vm.show()
      await nextTick()
      vi.runAllTimers()
      await flushPromises()
      const passedAnchor = vi.mocked(computePosition).mock.calls.at(-1)?.[0]
      expect(passedAnchor).not.toBe(document.querySelector('#trigger'))
      expect(
        (passedAnchor as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect()
      ).toBe(rect)
    })
  })

  describe('update method', () => {
    it('re-runs computePosition against the current anchor', async () => {
      vi.useFakeTimers()
      vi.mocked(computePosition).mockResolvedValue({ x: 1, y: 1 } as ComputePositionReturn)
      const virtualAnchor = {
        getBoundingClientRect: () =>
          ({
            width: 0,
            height: 0,
            x: 0,
            y: 0,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
          }) as DOMRect
      }
      const wrapper = shallowMount(Drop, {
        props: { mode: 'manual', anchor: virtualAnchor },
        global: { plugins: defaultPlugins(), stubs: { teleport: false } },
        attachTo: document.body
      })
      wrapper.vm.show()
      await nextTick()
      vi.runAllTimers()
      await flushPromises()
      const callsAfterShow = vi.mocked(computePosition).mock.calls.length

      vi.mocked(computePosition).mockResolvedValue({ x: 99, y: 99 } as ComputePositionReturn)
      await wrapper.vm.update()
      vi.runAllTimers()
      await flushPromises()
      expect(vi.mocked(computePosition).mock.calls.length).toBeGreaterThan(callsAfterShow)
      expect(wrapper.find('.oc-drop').attributes('style')).toContain('left: 99px;')
    })

    it('is a no-op when the drop is not open', async () => {
      vi.useFakeTimers()
      vi.mocked(computePosition).mockResolvedValue({ x: 0, y: 0 } as ComputePositionReturn)
      const virtualAnchor = {
        getBoundingClientRect: () =>
          ({
            width: 0,
            height: 0,
            x: 0,
            y: 0,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
          }) as DOMRect
      }
      const wrapper = shallowMount(Drop, {
        props: { mode: 'manual', anchor: virtualAnchor },
        global: { plugins: defaultPlugins(), stubs: { teleport: false } },
        attachTo: document.body
      })
      await wrapper.vm.update()
      expect(vi.mocked(computePosition)).not.toHaveBeenCalled()
    })
  })
})
