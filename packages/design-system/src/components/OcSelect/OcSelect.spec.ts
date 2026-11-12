import { defaultPlugins, mount, PartialComponentProps } from '@opencloud-eu/web-test-helpers'
import { DOMWrapper } from '@vue/test-utils'
import OcSelect from './OcSelect.vue'
import { nextTick } from 'vue'

const selectors = {
  ocSelect: '.oc-select',
  selectedOptions: '.vs__selected-options .vs__selected',
  deselectBtn: '.vs__selected-options .vs__deselect',
  deselectLockIcon: '.vs__deselect-lock',
  clearBtn: '.vs__clear',
  searchInput: '.vs__search',
  ocSpinner: '.oc-spinner',
  warningMessage: '.oc-text-input-warning',
  errorMessage: '.oc-text-input-danger',
  descriptionMessage: '.oc-text-input-description'
}

describe('OcSelect', () => {
  it('passes the options to the vue-select component', () => {
    const options = [{ label: 'label1' }, { label: 'label2' }]
    const wrapper = getWrapper({ options })
    expect(
      // options is just passed through, so it does not exist as prop on OcSelect, hence we need the any cast
      wrapper.findComponent<typeof OcSelect>(selectors.ocSelect).props('options' as any)
    ).toEqual(options)
  })
  it('lets consumers override dropdownShouldOpen', () => {
    const dropdownShouldOpen = vi.fn(() => false)
    const wrapper = getWrapper({ dropdownShouldOpen } as any)
    const vueSelect = wrapper.findComponent<typeof OcSelect>(selectors.ocSelect)
    expect(vueSelect.props('dropdownShouldOpen' as any)).toBe(dropdownShouldOpen)
  })
  it('shows ocSpinner component when loading', () => {
    const wrapper = getWrapper({ loading: true })
    expect(wrapper.find(selectors.ocSpinner).exists()).toBeTruthy()
  })
  it('triggers the "search:input"-event on search input', async () => {
    const wrapper = getWrapper()
    await wrapper.find(selectors.searchInput).trigger('input')
    expect(wrapper.emitted('search:input')).toBeDefined()
  })
  describe('clear button', () => {
    it('is hidden by default', () => {
      const options = [{ label: 'label1' }, { label: 'label2' }]
      const wrapper = getWrapper({ options, modelValue: options[0] })
      expect(wrapper.find(selectors.clearBtn).attributes('style')).toEqual('display: none;')
    })
    it('is visible if "clearable" is set to true', () => {
      const options = [{ label: 'label1' }, { label: 'label2' }]
      const wrapper = getWrapper({ options, modelValue: options[0], clearable: true })
      expect(wrapper.find(selectors.clearBtn).attributes('style')).toBeUndefined()
    })
  })
  describe('selected option', () => {
    it('displays', () => {
      const options = [{ label: 'label1' }, { label: 'label2' }]
      const wrapper = getWrapper({ options, modelValue: options[0] })
      expect(wrapper.findAll(selectors.selectedOptions).length).toBe(1)
      expect(wrapper.findAll(selectors.selectedOptions).at(0).text()).toEqual(options[0].label)
    })
    it('displays with a custom label property', () => {
      const options = [{ customLabel: 'label1' }, { customLabel: 'label2' }]
      const wrapper = getWrapper({ options, modelValue: options[0], optionLabel: 'customLabel' })
      expect(wrapper.findAll(selectors.selectedOptions).at(0).text()).toEqual(
        options[0].customLabel
      )
    })
    it('displays with a custom label function', () => {
      const options = [{ nested: { customLabel: 'label1' } }, { nested: { customLabel: 'label2' } }]
      const wrapper = getWrapper<(typeof options)[0]>({
        options,
        modelValue: options[0],
        getOptionLabel: (o) => (o as (typeof options)[0]).nested.customLabel
      })
      expect(wrapper.findAll(selectors.selectedOptions).at(0).text()).toEqual(
        options[0].nested.customLabel
      )
    })
    it('describes the input of a single select with its value', async () => {
      const options = [{ label: 'label1' }, { label: 'label2' }]
      const wrapper = getWrapper({ options, modelValue: options[1] })
      await nextTick()
      const describedBy = wrapper.find(selectors.searchInput).attributes('aria-describedby')
      expect(wrapper.find(`#${describedBy}`).text()).toBe('label2')
    })
    it('labels the input like its combobox', () => {
      const wrapper = getWrapper({ options: [{ label: 'label1' }] })
      expect(wrapper.find(selectors.searchInput).attributes('aria-label')).toBe(
        'Select label - Search for option'
      )
      expect(wrapper.find('.vs__dropdown-toggle').attributes('aria-label')).toBe(
        'Select label - Search for option'
      )
    })
    it('does not describe the input of a single select without a value', () => {
      const wrapper = getWrapper({ options: [{ label: 'label1' }] })
      expect(wrapper.find(selectors.searchInput).attributes('aria-describedby')).toBeUndefined()
    })
    it('does not describe the input of a multi select with its values', () => {
      const options = [{ label: 'label1' }, { label: 'label2' }]
      const wrapper = getWrapper({ options, modelValue: options[0], multiple: true })
      expect(wrapper.find(selectors.searchInput).attributes('aria-describedby')).toBeUndefined()
    })
    it('can be cleared if multi-select is allowed', () => {
      const options = [{ label: 'label1' }, { label: 'label2' }]
      const wrapper = getWrapper({ options, modelValue: options[0], multiple: true })
      expect(wrapper.find(selectors.deselectBtn).exists()).toBeTruthy()
      expect(wrapper.find(selectors.deselectLockIcon).exists()).toBeFalsy()
    })
    it.each([
      { props: { disabled: true }, lock: false },
      { props: { readOnly: true }, lock: true }
    ])('can not be deselected if the select is $props', ({ props, lock }) => {
      const options = [{ label: 'label1' }, { label: 'label2' }]
      const wrapper = getWrapper({ options, modelValue: options[0], multiple: true, ...props })
      expect(wrapper.find(selectors.deselectBtn).exists()).toBeFalsy()
      expect(wrapper.findAll(`${selectors.selectedOptions} .oc-icon`).length).toBe(lock ? 1 : 0)
      expect(wrapper.find(selectors.deselectLockIcon).exists()).toBe(lock)
    })
    it('can not be cleared if readonly', () => {
      const options = [{ label: 'label1', readonly: true }, { label: 'label2' }]
      const wrapper = getWrapper({ options, modelValue: options[0], multiple: true })
      expect(wrapper.find(selectors.deselectBtn).exists()).toBeFalsy()
      expect(wrapper.find(selectors.deselectLockIcon).exists()).toBeTruthy()
    })
  })
  it('opens the list on search input without a keydown, e.g. a paste', async () => {
    const wrapper = getWrapper({ options: [{ label: 'label1' }] }, { attachTo: document.body })
    const input = wrapper.find(selectors.searchInput)
    ;(input.element as HTMLInputElement).focus()
    await input.setValue('label')
    expect(wrapper.find('.vs__dropdown-menu').exists()).toBe(true)
    wrapper.unmount()
  })
  describe('escape key', () => {
    const options = [{ label: 'label1' }, { label: 'label2' }]

    async function pressEscape(input: ReturnType<ReturnType<typeof getWrapper>['find']>) {
      await input.trigger('keydown', { key: 'Escape', keyCode: 27 })
    }

    it('closes an open list, keeps the focus and does not close a surrounding modal', async () => {
      const onParentKeydown = vi.fn()
      document.body.addEventListener('keydown', onParentKeydown)
      const wrapper = getWrapper({ options }, { attachTo: document.body })
      const input = wrapper.find(selectors.searchInput)
      ;(input.element as HTMLInputElement).focus()
      await input.trigger('keydown', { key: 'ArrowDown', keyCode: 40 })
      expect(wrapper.find('.vs__dropdown-menu').exists()).toBe(true)

      await pressEscape(input)

      expect(wrapper.find('.vs__dropdown-menu').exists()).toBe(false)
      expect(document.activeElement).toBe(input.element)
      expect(onParentKeydown).not.toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }))
      document.body.removeEventListener('keydown', onParentKeydown)
      wrapper.unmount()
    })
    it('clears the search of a closed list and keeps the focus', async () => {
      const wrapper = getWrapper({ options }, { attachTo: document.body })
      const input = wrapper.find(selectors.searchInput)
      ;(input.element as HTMLInputElement).focus()
      await input.setValue('label')

      await pressEscape(input)
      expect((input.element as HTMLInputElement).value).toBe('')

      await pressEscape(input)
      expect(wrapper.find('.vs__dropdown-menu').exists()).toBe(false)
      expect(document.activeElement).toBe(input.element)
      wrapper.unmount()
    })
    it('keeps closing an open list without blurring if a custom keydown map is given', async () => {
      const onBackspace = vi.fn()
      const mapKeydown = (map: Record<number, (e: KeyboardEvent) => void>) => ({
        ...map,
        8: onBackspace
      })
      const wrapper = getWrapper({ options, mapKeydown }, { attachTo: document.body })
      const input = wrapper.find(selectors.searchInput)
      ;(input.element as HTMLInputElement).focus()
      await input.trigger('keydown', { key: 'ArrowDown', keyCode: 40 })

      await pressEscape(input)

      expect(wrapper.find('.vs__dropdown-menu').exists()).toBe(false)
      expect(document.activeElement).toBe(input.element)

      await input.trigger('keydown', { key: 'Backspace', keyCode: 8 })
      expect(onBackspace).toHaveBeenCalled()
      wrapper.unmount()
    })
  })
  describe('enter key', () => {
    it('prevents the default of the Enter that only enables the list, so a surrounding form does not submit', async () => {
      const events: KeyboardEvent[] = []
      const onKeydown = (event: KeyboardEvent) => events.push(event)
      document.body.addEventListener('keydown', onKeydown)
      const wrapper = getWrapper(
        { options: [{ label: 'label1' }, { label: 'label2' }] },
        { attachTo: document.body }
      )
      const input = wrapper.find(selectors.searchInput)
      ;(input.element as HTMLInputElement).focus()

      await input.trigger('keydown', { key: 'Enter', keyCode: 13 })

      expect(events).toHaveLength(1)
      expect(events[0].defaultPrevented).toBe(true)
      document.body.removeEventListener('keydown', onKeydown)
      wrapper.unmount()
    })
  })
  describe('focus after picking an option', () => {
    const options = [{ label: 'label1' }, { label: 'label2' }]

    async function openList(wrapper: ReturnType<typeof getWrapper>) {
      const input = wrapper.find(selectors.searchInput)
      ;(input.element as HTMLInputElement).focus()
      await input.trigger('keydown', { key: 'ArrowDown', keyCode: 40 })
      expect(wrapper.find('.vs__dropdown-menu').exists()).toBe(true)
      return input
    }

    async function press(element: DOMWrapper<Element>, pointerType: string | null = 'mouse') {
      if (pointerType) {
        await element.trigger('pointerdown', { pointerType })
      }
      await element.trigger('mousedown')
      await element.trigger('mouseup')
      await element.trigger('click')
      await nextTick()
    }

    function clickOption(
      wrapper: ReturnType<typeof getWrapper>,
      index: number,
      pointerType: string | null = 'mouse'
    ) {
      return press(wrapper.findAll('.vs__dropdown-option').at(index), pointerType)
    }

    it('stays in the select after a mouse pick and keeps the list closed', async () => {
      const wrapper = getWrapper({ options }, { attachTo: document.body })
      const input = await openList(wrapper)

      await clickOption(wrapper, 1)

      expect(wrapper.emitted('update:modelValue')).toEqual([[options[1]]])
      expect(document.activeElement).toBe(input.element)
      expect(wrapper.find('.vs__dropdown-menu').exists()).toBe(false)
      wrapper.unmount()
    })
    it('stays in the select after a keyboard pick and keeps the list closed', async () => {
      const wrapper = getWrapper({ options }, { attachTo: document.body })
      const input = await openList(wrapper)
      await input.trigger('keydown', { key: 'ArrowDown', keyCode: 40 })

      await input.trigger('keydown', { key: 'Enter', keyCode: 13 })
      await nextTick()

      expect(wrapper.emitted('update:modelValue')).toEqual([[options[0]]])
      expect(document.activeElement).toBe(input.element)
      expect(wrapper.find('.vs__dropdown-menu').exists()).toBe(false)
      wrapper.unmount()
    })
    it.each(['.vs__actions', '.vs__selected'])(
      'reopens the list with one click on %s after a mouse pick',
      async (target) => {
        const wrapper = getWrapper({ options }, { attachTo: document.body })
        const input = await openList(wrapper)
        await clickOption(wrapper, 1)

        await press(wrapper.find(target))

        expect(wrapper.find('.vs__dropdown-menu').exists()).toBe(true)
        expect(document.activeElement).toBe(input.element)
        wrapper.unmount()
      }
    )
    it('leaves the focus after a touch pick, so the soft keyboard closes', async () => {
      const wrapper = getWrapper({ options }, { attachTo: document.body })
      const input = await openList(wrapper)

      await clickOption(wrapper, 1, 'touch')

      expect(wrapper.emitted('update:modelValue')).toEqual([[options[1]]])
      expect(document.activeElement).not.toBe(input.element)
      expect(wrapper.find('.vs__dropdown-menu').exists()).toBe(false)
      wrapper.unmount()
    })
    it('stays in the select after a keyboard pick that follows a touch', async () => {
      const wrapper = getWrapper({ options }, { attachTo: document.body })
      const input = await openList(wrapper)
      await wrapper.find('.vs__dropdown-option').trigger('pointerdown', { pointerType: 'touch' })
      await input.trigger('keydown', { key: 'ArrowDown', keyCode: 40 })

      await input.trigger('keydown', { key: 'Enter', keyCode: 13 })
      await nextTick()

      expect(wrapper.emitted('update:modelValue')).toEqual([[options[0]]])
      expect(document.activeElement).toBe(input.element)
      expect(wrapper.find('.vs__dropdown-menu').exists()).toBe(false)
      wrapper.unmount()
    })
    it('stays in the select after a pick without a pointer that follows a touch on the toggle', async () => {
      const wrapper = getWrapper({ options }, { attachTo: document.body })
      await press(wrapper.find('.vs__actions'), 'touch')
      expect(wrapper.find('.vs__dropdown-menu').exists()).toBe(true)

      await clickOption(wrapper, 1, null)

      expect(wrapper.emitted('update:modelValue')).toEqual([[options[1]]])
      expect(document.activeElement).toBe(wrapper.find(selectors.searchInput).element)
      wrapper.unmount()
    })
    it('stays in the select after a pick without a pointer that follows a touch pick', async () => {
      const wrapper = getWrapper({ options }, { attachTo: document.body })
      const input = await openList(wrapper)
      await clickOption(wrapper, 1, 'touch')
      expect(document.activeElement).not.toBe(input.element)

      await press(wrapper.find('.vs__actions'), null)
      await clickOption(wrapper, 0, null)

      expect(wrapper.emitted('update:modelValue')).toEqual([[options[1]], [options[0]]])
      expect(document.activeElement).toBe(input.element)
      wrapper.unmount()
    })
    it('does not take the focus back from an element the pick moved it to', async () => {
      const button = document.createElement('button')
      document.body.appendChild(button)
      const wrapper = getWrapper({ options, 'onUpdate:modelValue': () => button.focus() } as any, {
        attachTo: document.body
      })
      await openList(wrapper)

      await clickOption(wrapper, 1)

      expect(document.activeElement).toBe(button)
      wrapper.unmount()
      button.remove()
    })
  })
  describe('keyboard highlight', () => {
    const options = [{ label: 'label1' }, { label: 'label2' }]

    it('outlines the highlighted option while typing, not only after arrow keys', async () => {
      const wrapper = getWrapper({ options })
      await wrapper.find(selectors.ocSelect).trigger('mousemove')
      await wrapper.find(selectors.searchInput).trigger('keydown', { key: 'l' })
      expect(wrapper.find(selectors.ocSelect).classes()).toContain('oc-select-keyboard-navigation')
    })
    it('drops the outline when the mouse is used', async () => {
      const wrapper = getWrapper({ options })
      await wrapper.find(selectors.searchInput).trigger('keydown', { key: 'l' })
      expect(wrapper.find(selectors.ocSelect).classes()).toContain('oc-select-keyboard-navigation')
      await wrapper.find(selectors.ocSelect).trigger('mousemove')
      expect(wrapper.find(selectors.ocSelect).classes()).not.toContain(
        'oc-select-keyboard-navigation'
      )
    })
  })
  describe('required mark', () => {
    it('marks the search input as required for assistive technologies', () => {
      const wrapper = getWrapper({ requiredMark: true })
      expect(wrapper.find(selectors.searchInput).attributes('aria-required')).toBe('true')
    })
    it('does not mark the search input as required without the mark', () => {
      const wrapper = getWrapper()
      expect(wrapper.find(selectors.searchInput).attributes('aria-required')).toBeUndefined()
    })
  })
  describe('message', () => {
    it('displays an error message', () => {
      const wrapper = getWrapper({ errorMessage: 'foo' })
      expect(wrapper.find(selectors.errorMessage).exists()).toBeTruthy()
    })
    it('displays a description message', () => {
      const wrapper = getWrapper({ descriptionMessage: 'foo' })
      expect(wrapper.find(selectors.descriptionMessage).exists()).toBeTruthy()
    })
  })
})

function getWrapper<T>(
  props: PartialComponentProps<typeof OcSelect> & {
    options?: T[]
    getOptionLabel?: (o: T) => string
    modelValue?: T
  } = {},
  { attachTo }: { attachTo?: HTMLElement } = {}
) {
  return mount(OcSelect, {
    props: {
      label: 'Select label',
      ...props
    },
    global: {
      plugins: [...defaultPlugins()]
    },
    attachTo
  })
}
