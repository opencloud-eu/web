import { mount } from '@opencloud-eu/web-test-helpers'
import OcRange from './OcRange.vue'

describe('OcRange', () => {
  const rangeSelector = "input[type='range']"

  it('sets the provided input attributes', () => {
    const wrapper = mount(OcRange, {
      props: {
        id: 'range-input',
        label: 'Range input',
        modelValue: 3,
        min: 1,
        max: 9,
        step: 2
      },
      attrs: {
        class: 'range-input-class',
        'data-testid': 'range-input'
      }
    })

    const range = wrapper.find(rangeSelector)
    expect(wrapper.classes()).toContain('range-input-class')
    expect(range.attributes('id')).toBe('range-input')
    expect(range.attributes('min')).toBe('1')
    expect(range.attributes('max')).toBe('9')
    expect(range.attributes('step')).toBe('2')
    expect(range.attributes('data-testid')).toBe('range-input')
    expect(range.attributes('class')).toContain('oc-range')
    expect(range.attributes('class')).not.toContain('range-input-class')
  })

  it('renders the label above the input by default', () => {
    const wrapper = mount(OcRange, {
      props: {
        label: 'Range input',
        min: 0,
        max: 10
      }
    })

    expect(wrapper.classes()).toContain('flex-col')
    expect(wrapper.find(rangeSelector).attributes('class')).toContain('w-full')
  })

  it('renders the label inline if enabled', () => {
    const wrapper = mount(OcRange, {
      props: {
        label: 'Range input',
        min: 0,
        max: 10,
        inlineLabel: true
      }
    })

    expect(wrapper.classes()).toContain('items-center')
    expect(wrapper.find(rangeSelector).attributes('class')).toContain('grow')
  })

  it('renders the provided label for the input', () => {
    const wrapper = mount(OcRange, {
      props: {
        id: 'range-input',
        label: 'Range input',
        min: 0,
        max: 10
      }
    })

    const label = wrapper.find('label')
    expect(label.attributes('for')).toBe('range-input')
    expect(label.text()).toBe('Range input')
  })

  it('visually hides the label if enabled', () => {
    const wrapper = mount(OcRange, {
      props: {
        label: 'Range input',
        min: 0,
        max: 10,
        hideLabel: true
      }
    })

    expect(wrapper.find('label').attributes('class')).toContain('sr-only')
  })

  it('applies the provided input classes to the input', () => {
    const wrapper = mount(OcRange, {
      props: {
        label: 'Range input',
        min: 0,
        max: 10,
        inputClass: 'max-w-[50%]'
      }
    })

    expect(wrapper.find(rangeSelector).attributes('class')).toContain('max-w-[50%]')
    expect(wrapper.classes()).not.toContain('max-w-[50%]')
  })

  it('renders visible keyboard focus classes', () => {
    const wrapper = mount(OcRange, {
      props: {
        label: 'Range input',
        min: 0,
        max: 10
      }
    })

    const rangeClasses = wrapper.find(rangeSelector).attributes('class')
    expect(rangeClasses).toContain('outline-role-secondary')
    expect(rangeClasses).toContain('focus-visible:outline')
  })

  it('emits number values', async () => {
    const wrapper = mount(OcRange, {
      props: {
        label: 'Range input',
        min: 0,
        max: 10,
        modelValue: 3
      }
    })

    const range = wrapper.find<HTMLInputElement>(rangeSelector)
    range.element.value = '4'
    await range.trigger('input')

    expect(wrapper.emitted('update:modelValue')[0][0]).toBe(4)
  })

  it('emits change when the value changes', async () => {
    const wrapper = mount(OcRange, {
      props: {
        label: 'Range input',
        min: 0,
        max: 10,
        modelValue: 3
      }
    })

    const range = wrapper.find<HTMLInputElement>(rangeSelector)
    range.element.value = '4'
    await range.trigger('change')

    expect(wrapper.emitted('change')[0][0]).toBe(4)
  })
})
