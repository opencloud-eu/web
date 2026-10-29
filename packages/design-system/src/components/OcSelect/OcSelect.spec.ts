import { defaultPlugins, mount, PartialComponentProps } from '@opencloud-eu/web-test-helpers'
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
  it('lets consumers override the default vue-select handlers', () => {
    const mapKeydown = vi.fn()
    const dropdownShouldOpen = vi.fn(() => false)
    const wrapper = getWrapper({ mapKeydown, dropdownShouldOpen } as any)
    const vueSelect = wrapper.findComponent<typeof OcSelect>(selectors.ocSelect)
    expect(vueSelect.props('mapKeydown' as any)).toBe(mapKeydown)
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
