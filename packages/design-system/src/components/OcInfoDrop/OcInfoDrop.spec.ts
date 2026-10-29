import { FocusTrap } from 'focus-trap-vue'
import OcDrop from '../OcDrop/OcDrop.vue'
import OcInfoDrop from './OcInfoDrop.vue'
import {
  PartialComponentProps,
  defaultPlugins,
  mount,
  shallowMount
} from '@opencloud-eu/web-test-helpers'
import { flushPromises } from '@vue/test-utils'

describe('OcInfoDrop', () => {
  function getWrapperWithProps(props: PartialComponentProps<typeof OcInfoDrop>) {
    return shallowMount(OcInfoDrop, {
      props: {
        ...props,
        title: props.title || 'test-title'
      },
      global: {
        plugins: [...defaultPlugins()],
        renderStubDefaultSlot: true,
        stubs: {
          OcDrop: true,
          OcList: false
        }
      }
    })
  }
  describe('should use props correctly', () => {
    it('should set title prop', () => {
      const wrapper = getWrapperWithProps({ title: 'test-my-title' })
      expect(wrapper.find('.info-title').text()).toBe('test-my-title')
    })
    it('should set text prop', () => {
      const wrapper = getWrapperWithProps({ text: 'test-my-text' })
      expect(wrapper.find('.info-text').text()).toBe('test-my-text')
    })
    it('should set list prop', () => {
      const listValues = [
        { text: 'a-list-value' },
        { text: 'b-list-value' },
        { text: 'c-list-value' }
      ]
      const wrapper = getWrapperWithProps({ list: listValues })
      const result = wrapper.find('.info-list').text()
      listValues.forEach((value) => {
        expect(result).toContain(value.text)
      })
    })
    it('renders items without headlines as a plain list', () => {
      const wrapper = getWrapperWithProps({ list: [{ text: 'a' }, { text: 'b' }] })
      const list = wrapper.find('.info-list')
      expect(list.element.tagName).toBe('UL')
      expect(list.classes()).toContain('oc-list')
      expect(list.findAll('li').length).toBe(2)
      expect(list.find('dt').exists()).toBe(false)
      expect(list.find('dd').exists()).toBe(false)
    })
    it('renders headlines and their items as a definition list', () => {
      const wrapper = getWrapperWithProps({
        list: [{ text: 'term', headline: true }, { text: 'definition' }]
      })
      const list = wrapper.find('.info-list')
      expect(list.element.tagName).toBe('DL')
      expect(list.find('dt').text()).toBe('term')
      expect(list.find('dd').text()).toBe('definition')
      expect(list.find('li').exists()).toBe(false)
    })
    it('should set a readMore link', () => {
      const wrapper = getWrapperWithProps({ readMoreLink: 'opencloud.design' })
      const attributes = wrapper.find('.info-more-link').attributes()
      expect(attributes['href']).toBe('opencloud.design')
      expect(attributes['target']).toBe('_blank')
    })
    it('should pass the teleport target to the drop', () => {
      const wrapper = getWrapperWithProps({ teleport: '#app-runtime-drop' })
      expect(wrapper.findComponent(OcDrop).props('teleport')).toBe('#app-runtime-drop')
    })
    it('should set end-text prop', () => {
      const wrapper = getWrapperWithProps({ endText: 'test-my-text' })
      expect(wrapper.find('.info-text-end').text()).toBe('test-my-text')
    })
    describe('focus trap', () => {
      it('is active if the drop is open', async () => {
        const wrapper = getWrapperWithProps({ title: 'title' })
        wrapper.findComponent<typeof OcDrop>('oc-drop-stub').vm.$emit('show-drop')
        await wrapper.vm.$nextTick()
        const focusTrap = wrapper.findComponent<typeof FocusTrap>('focus-trap-stub')
        expect(focusTrap.props('active')).toBeTruthy()
      })
      it('is not active if the drop is closed', () => {
        const wrapper = getWrapperWithProps({ title: 'title' })
        const focusTrap = wrapper.findComponent<typeof FocusTrap>('focus-trap-stub')
        expect(focusTrap.props('active')).toBeFalsy()
      })
    })
  })
  describe('focus return', () => {
    beforeEach(() => {
      // jsdom has no layout, so focus-trap would consider every element hidden
      vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
        new DOMRect(0, 0, 10, 10)
      ] as unknown as DOMRectList)
    })
    afterEach(() => {
      vi.restoreAllMocks()
    })

    async function openAndMoveFocus() {
      document.body.innerHTML = ''
      const wrapper = mount(
        {
          template:
            '<div><button id="toggle">?</button><oc-info-drop toggle="#toggle" title="Info" read-more-link="https://example.org" /></div>',
          components: { OcInfoDrop }
        },
        // a real transition keeps the closing drop in the DOM for a moment, like in the browser
        {
          global: { plugins: defaultPlugins(), stubs: { transition: false } },
          attachTo: document.body
        }
      )
      const toggle = document.querySelector<HTMLElement>('#toggle')
      toggle.focus()
      toggle.click()
      await flushPromises()
      await new Promise((resolve) => setTimeout(resolve))

      const link = document.querySelector<HTMLElement>('.info-more-link')
      link.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
      link.focus()
      return { wrapper, toggle, link }
    }

    it.each([
      [
        'Escape',
        (el: HTMLElement) =>
          el.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true })
          )
      ],
      ['the close button', () => document.querySelector<HTMLElement>('.info-header button').click()]
    ])('returns focus to the toggle after tabbing and closing with %s', async (_, close) => {
      const { wrapper, toggle, link } = await openAndMoveFocus()

      close(link)
      await flushPromises()
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(document.querySelector('.info-drop-content')).toBeNull()
      expect(document.activeElement).toBe(toggle)
      wrapper.unmount()
    })
  })
})
