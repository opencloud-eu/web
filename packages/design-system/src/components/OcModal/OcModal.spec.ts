import { defaultPlugins, mount, shallowMount } from '@opencloud-eu/web-test-helpers'
import Modal from './OcModal.vue'
import OcButton from './../OcButton/OcButton.vue'
import { registerOpenDrop, unregisterOpenDrop } from '../OcDrop/dropRegistry'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'

const defaultProps = {
  title: 'Example title',
  message: 'Example message'
}

const inputProps = {
  title: 'Create new folder',
  hasInput: true,
  inputValue: 'New folder',
  inputLabel: 'Folder name'
}

describe('OcModal', () => {
  it('overrides props message with slot', () => {
    const wrapper = shallowMount(Modal, {
      global: { renderStubDefaultSlot: true, plugins: [...defaultPlugins()] },
      props: {
        ...defaultProps
      },
      slots: {
        content: '<p>Slot message</p>'
      }
    })

    expect(wrapper.find('.oc-modal-body-message > p').text()).toMatch('Slot message')
    expect(wrapper.html()).toMatchSnapshot()
  })

  it('matches snapshot', () => {
    const wrapper = shallowMount(Modal, {
      global: { renderStubDefaultSlot: true, plugins: [...defaultPlugins()] },
      props: defaultProps
    })

    expect(wrapper.html()).toMatchSnapshot()
  })

  it('only dims the background while it is the topmost modal', () => {
    const backdrop = (active: boolean) =>
      shallowMount(Modal, {
        global: { renderStubDefaultSlot: true, plugins: [...defaultPlugins()] },
        props: { ...defaultProps, active }
      }).find('.oc-modal-background')

    expect(backdrop(true).classes()).toContain('bg-black/40')
    expect(backdrop(false).classes()).not.toContain('bg-black/40')
  })

  it('displays input', () => {
    const wrapper = shallowMount(Modal, {
      global: { renderStubDefaultSlot: true, plugins: [...defaultPlugins()] },
      props: inputProps
    })

    expect(wrapper.findAll('.oc-modal-body-input').length).toBe(1)
    expect(wrapper.html()).toMatchSnapshot()
  })

  describe('enter key on the input', () => {
    const mountInputModal = () =>
      mount(Modal, {
        global: {
          renderStubDefaultSlot: true,
          plugins: [...defaultPlugins()],
          stubs: { 'focus-trap': true }
        },
        props: inputProps
      })

    it('emits confirm', async () => {
      const wrapper = mountInputModal()
      await wrapper.find('.oc-modal-body-input input').trigger('keydown', { key: 'Enter' })
      expect(wrapper.emitted('confirm')).toEqual([['New folder']])
    })

    it('does not emit confirm while an IME composition session is active', async () => {
      const wrapper = mountInputModal()
      await wrapper
        .find('.oc-modal-body-input input')
        .trigger('keydown', { key: 'Enter', isComposing: true })
      expect(wrapper.emitted('confirm')).toBeUndefined()
    })

    it('does not emit confirm when the keydown event has keyCode 229', async () => {
      const wrapper = mountInputModal()
      await wrapper
        .find('.oc-modal-body-input input')
        .trigger('keydown', { key: 'Enter', keyCode: 229 })
      expect(wrapper.emitted('confirm')).toBeUndefined()
    })
  })

  describe('cancelling', () => {
    const mountModal = (props: Record<string, unknown> = {}) =>
      mount(Modal, {
        global: {
          renderStubDefaultSlot: true,
          plugins: [...defaultPlugins()],
          stubs: { 'focus-trap': true }
        },
        props: { ...defaultProps, ...props }
      })

    it('emits cancel when pressing escape', async () => {
      const wrapper = mountModal()
      await wrapper.find('[role="dialog"]').trigger('keydown.esc')
      expect(wrapper.emitted('cancel')).toBeTruthy()
    })

    it('emits cancel when pressing escape after focus left the dialog', async () => {
      const wrapper = mountModal()
      await wrapper.find('.oc-modal-background').trigger('click')
      pressEscapeFromBody()

      expect(wrapper.emitted('cancel')).toBeTruthy()
    })

    it('does not emit cancel from the document while inactive', () => {
      const wrapper = mountModal({ active: false })
      pressEscapeFromBody()

      expect(wrapper.emitted('cancel')).toBeFalsy()
    })

    // the cancel button is disabled while loading, so escape has to be blocked as
    // well. Otherwise an in-flight handler gets discarded without its result ever
    // reaching the user.
    it('does not emit cancel while loading', async () => {
      const wrapper = mountModal({ isLoading: true })
      await wrapper.find('[role="dialog"]').trigger('keydown.esc')
      expect(wrapper.emitted('cancel')).toBeFalsy()
    })

    it('does not emit cancel from the document while loading', () => {
      const wrapper = mountModal({ isLoading: true })
      pressEscapeFromBody()

      expect(wrapper.emitted('cancel')).toBeFalsy()
    })

    describe('cancel action', () => {
      it('is not rendered by default', () => {
        const wrapper = mountModal()
        expect(wrapper.find('.oc-modal-body-actions-cancel').exists()).toBeFalsy()
      })

      it('is rendered in front of the confirm button if "showCancelAction" is set', () => {
        const wrapper = mountModal({ showCancelAction: true })
        const buttons = wrapper.findAll('.oc-modal-body-actions-grid button')

        expect(buttons.length).toBe(2)
        expect(buttons[0].classes()).toContain('oc-modal-body-actions-cancel')
        expect(buttons[0].text()).toBe('Cancel')
        expect(buttons[1].classes()).toContain('oc-modal-body-actions-confirm')
      })

      // custom components teleport their buttons into the actions container, e.g. the
      // unsaved changes dialog's "Don't Save", which belongs between Cancel and Save
      it('keeps the actions container between the cancel action and the confirm button', () => {
        const wrapper = mountModal({ showCancelAction: true, actionsId: 'custom-actions' })
        const children = wrapper.find('.oc-modal-body-actions-grid').element.children

        expect(children[0].classList).toContain('oc-modal-body-actions-cancel')
        expect(children[1].id).toBe('custom-actions')
        expect(children[2].classList).toContain('oc-modal-body-actions-confirm')
      })

      it('emits cancel when clicked', async () => {
        const wrapper = mountModal({ showCancelAction: true })
        await wrapper.find('.oc-modal-body-actions-cancel').trigger('click')
        expect(wrapper.emitted('cancel')).toBeTruthy()
      })

      it('is disabled while loading', () => {
        const wrapper = mountModal({ showCancelAction: true, isLoading: true })
        expect(wrapper.find('.oc-modal-body-actions-cancel').attributes('disabled')).toBeDefined()
      })
    })
  })

  describe('focus with the real focus trap', () => {
    let wrapper: ReturnType<typeof mount>
    beforeEach(() => {
      // jsdom has no layout, so focus-trap would consider every element hidden
      vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
        new DOMRect(0, 0, 10, 10)
      ] as unknown as DOMRectList)
    })
    afterEach(async () => {
      wrapper.unmount()
      // lets the trap return the focus before the next test starts
      await new Promise((resolve) => setTimeout(resolve))
      vi.restoreAllMocks()
    })

    async function settle() {
      await flushPromises()
      await new Promise((resolve) => setTimeout(resolve))
      await new Promise((resolve) => setTimeout(resolve))
    }

    async function mountModal({
      props = {
        ...inputProps,
        contextualHelperLabel: 'Help',
        contextualHelperData: { title: 'Info', readMoreLink: 'https://example.org' }
      },
      slots = {},
      elementBefore
    }: {
      props?: InstanceType<typeof Modal>['$props']
      slots?: { content?: ReturnType<typeof defineComponent> }
      elementBefore?: HTMLElement
    } = {}) {
      document.body.innerHTML = ''
      if (elementBefore) {
        document.body.appendChild(elementBefore)
      }
      wrapper = mount(Modal, {
        props,
        slots,
        global: { plugins: [...defaultPlugins()], stubs: { transition: false } },
        attachTo: document.body
      })
      await settle()
    }

    it('focuses the input when opened', async () => {
      await mountModal()
      expect(document.activeElement).toBe(wrapper.find('.oc-modal-body-input input').element)
    })

    it('focuses the element matching the initial focus selector inside the own modal', async () => {
      const elementBefore = document.createElement('input')
      elementBefore.classList.add('initial-target')
      const Content = defineComponent({
        template: '<div><input class="first" /><input class="initial-target" /></div>'
      })
      await mountModal({
        props: { ...defaultProps, focusTrapInitial: '.initial-target' },
        slots: { content: Content },
        elementBefore
      })
      expect(document.activeElement).toBe(wrapper.find('.oc-modal .initial-target').element)
    })

    it('focuses the body if the focused element and the initial focus target get removed', async () => {
      const show = ref(true)
      const Content = defineComponent({
        setup: () => ({ show }),
        template:
          '<div><template v-if="show"><input id="initial-target" /><button class="action">Go</button></template></div>'
      })
      await mountModal({
        props: { ...defaultProps, focusTrapInitial: '#initial-target' },
        slots: { content: Content }
      })
      document.querySelector<HTMLElement>('.action').focus()

      show.value = false
      await nextTick()
      await settle()

      expect(document.activeElement).toBe(wrapper.find('.oc-modal-body').element)
    })

    it('focuses the body when opened, also if the content focused an element on mount', async () => {
      const FocusingContent = defineComponent({
        mounted() {
          ;(this.$el as HTMLElement).focus()
        },
        template: '<button class="focusing-content">Option</button>'
      })
      await mountModal({ props: defaultProps, slots: { content: FocusingContent } })
      expect(document.activeElement).toBe(wrapper.find('.oc-modal-body').element)
    })

    it.each([
      [
        'Escape',
        (el: HTMLElement) =>
          el.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true })
          )
      ],
      ['the close button', () => document.querySelector<HTMLElement>('.info-header button').click()]
    ])(
      'returns the focus to the info drop toggle after tabbing and closing it with %s',
      async (_, close) => {
        await mountModal()
        await expectFocusReturnToInfoDropToggle(close)
      }
    )

    it('returns the focus to the info drop toggle after closing it with an initial focus selector', async () => {
      await mountModal({
        props: {
          ...inputProps,
          focusTrapInitial: '.oc-modal-body-input input',
          contextualHelperLabel: 'Help',
          contextualHelperData: { title: 'Info', readMoreLink: 'https://example.org' }
        }
      })
      await expectFocusReturnToInfoDropToggle(() =>
        document.querySelector<HTMLElement>('.info-header button').click()
      )
    })

    async function expectFocusReturnToInfoDropToggle(close: (el: HTMLElement) => void) {
      const toggle = document.querySelector<HTMLElement>('.oc-contextual-helper button')
      toggle.focus()
      toggle.click()
      await settle()

      const link = document.querySelector<HTMLElement>('.info-more-link')
      link.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
      link.focus()
      close(link)
      await settle()

      expect(document.querySelector('.info-drop-content')).toBeNull()
      expect(document.activeElement).toBe(toggle)
    }
  })

  describe('focus return after closing', () => {
    let openDrops: HTMLElement[]

    beforeEach(() => {
      vi.useFakeTimers()
      openDrops = []
    })

    afterEach(() => {
      openDrops.forEach((dropEl) => unregisterOpenDrop(dropEl))
      document.body.innerHTML = ''
      vi.useRealTimers()
    })

    function createButton(parent: HTMLElement) {
      const button = document.createElement('button')
      parent.appendChild(button)
      return button
    }

    // drops are teleported to the body, they only know the element they were opened from
    function openDrop(anchor: HTMLElement) {
      const dropEl = document.createElement('div')
      dropEl.classList.add('oc-drop')
      document.body.appendChild(dropEl)
      registerOpenDrop(dropEl, { getAnchor: () => anchor, hide: vi.fn() })
      openDrops.push(dropEl)
      return dropEl
    }

    function closeDrop(dropEl: HTMLElement) {
      unregisterOpenDrop(dropEl)
      dropEl.remove()
    }

    // the modal remembers the focused element while being set up, so the opener needs the focus first
    function openModalFrom(opener: HTMLElement) {
      opener.focus()
      return mount(Modal, {
        global: {
          renderStubDefaultSlot: true,
          plugins: [...defaultPlugins()],
          stubs: { 'focus-trap': true }
        },
        props: defaultProps
      })
    }

    it('focuses the anchor of the drop the modal was opened from', () => {
      const anchor = createButton(document.body)
      const dropEl = openDrop(anchor)
      const wrapper = openModalFrom(createButton(dropEl))
      closeDrop(dropEl)
      expect(document.activeElement).toBe(document.body)

      wrapper.unmount()
      // focus-trap returns the focus with a delay as well, the modal has to refocus after it
      expect(document.activeElement).toBe(document.body)
      vi.runAllTimers()

      expect(document.activeElement).toBe(anchor)
    })

    it('focuses the toggle of the outermost drop if opened from a nested drop', () => {
      const toggle = createButton(document.body)
      const parentDrop = openDrop(toggle)
      const nestedDrop = openDrop(createButton(parentDrop))
      const wrapper = openModalFrom(createButton(nestedDrop))
      closeDrop(nestedDrop)
      closeDrop(parentDrop)

      wrapper.unmount()
      vi.runAllTimers()

      expect(document.activeElement).toBe(toggle)
    })

    it('focuses the drop anchor if the focus stayed on the item of the closed drop', () => {
      const anchor = createButton(document.body)
      const dropEl = openDrop(anchor)
      const item = createButton(dropEl)
      const wrapper = openModalFrom(item)
      // the drop is only hidden, so its item keeps the focus
      unregisterOpenDrop(dropEl)
      expect(document.activeElement).toBe(item)

      wrapper.unmount()
      vi.runAllTimers()

      expect(document.activeElement).toBe(anchor)
    })

    it('keeps the focus on the item if its drop is still open', () => {
      const dropEl = openDrop(createButton(document.body))
      const item = createButton(dropEl)
      const wrapper = openModalFrom(item)

      wrapper.unmount()
      vi.runAllTimers()

      expect(document.activeElement).toBe(item)
    })

    it('leaves the focus alone if it already moved to another element', () => {
      const dropEl = openDrop(createButton(document.body))
      const wrapper = openModalFrom(createButton(dropEl))
      closeDrop(dropEl)
      const other = createButton(document.body)

      wrapper.unmount()
      other.focus()
      vi.runAllTimers()

      expect(document.activeElement).toBe(other)
    })

    it('does nothing if the drop anchor was removed', () => {
      const anchor = createButton(document.body)
      const focusSpy = vi.spyOn(anchor, 'focus')
      const dropEl = openDrop(anchor)
      const wrapper = openModalFrom(createButton(dropEl))
      closeDrop(dropEl)
      anchor.remove()

      wrapper.unmount()
      expect(() => vi.runAllTimers()).not.toThrow()

      expect(focusSpy).not.toHaveBeenCalled()
      expect(document.activeElement).toBe(document.body)
    })

    it('does not move the focus if the modal was not opened from a drop', () => {
      const opener = createButton(document.body)
      const wrapper = openModalFrom(opener)
      opener.blur()

      wrapper.unmount()
      expect(() => vi.runAllTimers()).not.toThrow()

      expect(document.activeElement).toBe(document.body)
    })
  })

  it('displays loading state', async () => {
    const waitForSpinnerToShow = async () => {
      await wrapper.vm.$nextTick()
      return new Promise((resolve) => setTimeout(resolve, 1000))
    }

    const wrapper = mount(Modal, {
      global: {
        renderStubDefaultSlot: true,
        plugins: [...defaultPlugins()],
        stubs: {
          'focus-trap': true
        }
      },
      props: {
        ...defaultProps,
        isLoading: true
      }
    })

    const cancelButton = wrapper.find('.oc-modal-title-actions-cancel')
    const confirmButton = wrapper.find('.oc-modal-body-actions-confirm')

    expect(cancelButton.attributes('disabled')).toBeDefined()
    expect(confirmButton.attributes('disabled')).toBeDefined()
    expect(
      wrapper.findComponent<typeof OcButton>('.oc-modal-body-actions-confirm').props('showSpinner')
    ).toBeFalsy()
    expect(
      wrapper.findComponent<typeof OcButton>('.oc-modal-body-actions-confirm').props('appearance')
    ).toEqual('filled')

    await waitForSpinnerToShow()

    expect(
      wrapper.findComponent<typeof OcButton>('.oc-modal-body-actions-confirm').props('showSpinner')
    ).toBeTruthy()
    expect(
      wrapper.findComponent<typeof OcButton>('.oc-modal-body-actions-confirm').props('appearance')
    ).toEqual('outline')
    expect(wrapper.html()).toMatchSnapshot()
  })
})

const pressEscapeFromBody = () => {
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
}
