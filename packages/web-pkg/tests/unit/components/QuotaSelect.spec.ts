import QuotaSelect from '../../../src/components/QuotaSelect.vue'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import { createGettext } from 'vue3-gettext'

describe('QuotaSelect', () => {
  it('shows the current quota and sorted presets with unlimited last', async () => {
    const wrapper = getWrapper({ totalQuota: 45e9 })
    expect(selectedLabel(wrapper)).toBe('45 GB')

    await openSelect(wrapper)

    expect(optionLabels(wrapper)).toEqual([
      '1 GB',
      '2 GB',
      '5 GB',
      '10 GB',
      '45 GB',
      '50 GB',
      '100 GB',
      'No restriction'
    ])
    expect(wrapper.emitted('selectedOptionChange')).toBeUndefined()
  })

  it('shows unlimited for a quota of zero', () => {
    expect(selectedLabel(getWrapper({ totalQuota: 0 }))).toBe('No restriction')
  })

  it('only offers presets up to the maximum', async () => {
    const wrapper = getWrapper({ totalQuota: 2e9, maxQuota: 4e9 })
    await openSelect(wrapper)

    expect(optionLabels(wrapper)).toEqual(['1 GB', '2 GB'])
  })

  it.each([45e9, 100e9])(
    'keeps an existing quota of %i above the maximum visible but disabled',
    async (totalQuota) => {
      const wrapper = getWrapper({ totalQuota, maxQuota: 4e9 })
      await openSelect(wrapper)

      const options = wrapper.findAll('.vs__dropdown-option')
      expect(options).toHaveLength(3)
      expect(options.at(-1).classes()).toContain('vs__dropdown-option--disabled')
    }
  )

  it('keeps an existing unlimited quota visible but disabled with a maximum', async () => {
    const wrapper = getWrapper({ totalQuota: 0, maxQuota: 4e9 })
    await openSelect(wrapper)

    const unlimited = wrapper.findAll('.vs__dropdown-option').at(-1)
    expect(unlimited.text()).toBe('No restriction')
    expect(unlimited.classes()).toContain('vs__dropdown-option--disabled')
  })

  it('updates a custom quota supplied by the parent without emitting a change', async () => {
    const wrapper = getWrapper()
    await wrapper.setProps({ totalQuota: 45e9 })

    expect(selectedLabel(wrapper)).toBe('45 GB')
    expect(wrapper.emitted('selectedOptionChange')).toBeUndefined()
  })

  it('rebuilds the available options when the maximum changes', async () => {
    const wrapper = getWrapper({ totalQuota: 2e9 })
    await wrapper.setProps({ maxQuota: 4e9 })
    await openSelect(wrapper)
    expect(optionLabels(wrapper)).toEqual(['1 GB', '2 GB'])

    await wrapper.setProps({ maxQuota: 0 })
    expect(optionLabels(wrapper).at(-1)).toBe('No restriction')
  })

  describe('default quota', () => {
    it('is only offered when explicitly enabled', async () => {
      const wrapper = getWrapper()
      await openSelect(wrapper)
      expect(optionLabels(wrapper)).not.toContain('Default')
    })

    it.each([0, 4e9])('selects Default independently of the maximum %i', async (maxQuota) => {
      const wrapper = getWrapper({ totalQuota: null, allowDefault: true, maxQuota })
      expect(selectedLabel(wrapper)).toBe('Default')
      await openSelect(wrapper)
      expect(optionLabels(wrapper)[0]).toBe('Default')
      expect(wrapper.emitted('selectedOptionChange')).toBeUndefined()
    })

    it('can be reselected after choosing a numeric quota', async () => {
      const wrapper = getWrapper({ totalQuota: null, allowDefault: true })
      await chooseOption(wrapper, '2 GB')
      expect(selectedLabel(wrapper)).toBe('2 GB')
      await chooseOption(wrapper, 'Default')

      expect(selectedLabel(wrapper)).toBe('Default')
      expect(wrapper.emitted('selectedOptionChange')).toEqual([
        [{ value: 2e9, displayValue: '2 GB' }],
        [{ value: null, displayValue: 'Default' }]
      ])
    })

    it('keeps Default separate from unlimited', async () => {
      const wrapper = getWrapper({ totalQuota: null, allowDefault: true })
      await chooseOption(wrapper, 'No restriction')
      expect(selectedLabel(wrapper)).toBe('No restriction')
      expect(wrapper.emitted('selectedOptionChange')).toEqual([
        [{ value: 0, displayValue: 'No restriction' }]
      ])
    })
  })

  describe('typing a value and pressing Enter', () => {
    it.each(['0', '0.0', '0,0'])('selects unlimited for "%s"', async (input) => {
      const wrapper = getWrapper({ totalQuota: 2e9, allowDefault: true })
      await enterQuota(wrapper, input)
      expect(wrapper.emitted('selectedOptionChange')).toEqual([
        [{ displayValue: 'No restriction', value: 0 }]
      ])
    })

    it.each(['4.1', '4,1'])('rounds "%s" to whole bytes', async (input) => {
      const wrapper = getWrapper()
      await enterQuota(wrapper, input)
      expect(wrapper.emitted('selectedOptionChange')).toEqual([
        [{ displayValue: '4.1 GB', value: 4100000000 }]
      ])
      expect(selectedLabel(wrapper)).toBe('4.1 GB')
    })

    it('selects a preset without duplicating it', async () => {
      const wrapper = getWrapper()
      await enterQuota(wrapper, '2')
      await openSelect(wrapper)
      expect(optionLabels(wrapper).filter((label) => label === '2 GB')).toHaveLength(1)
      expect(selectedLabel(wrapper)).toBe('2 GB')
    })

    it('shows a custom quota only once after reopening the dropdown', async () => {
      const wrapper = getWrapper()
      await enterQuota(wrapper, '4.1')
      await openSelect(wrapper)
      expect(optionLabels(wrapper).filter((label) => label === '4.1 GB')).toHaveLength(1)
    })

    it('keeps custom choices available when another quota is selected', async () => {
      const wrapper = getWrapper({ totalQuota: 45e9 })
      await enterQuota(wrapper, '4.1')
      await chooseOption(wrapper, '2 GB')
      await openSelect(wrapper)

      expect(optionLabels(wrapper).filter((label) => label === '4.1 GB')).toHaveLength(1)
      expect(optionLabels(wrapper).filter((label) => label === '45 GB')).toHaveLength(1)
    })

    it.each(['lorem ipsum', '-1', '1,', '1.', '1e3', '0.0000000001'])(
      'rejects invalid input "%s"',
      async (input) => {
        const wrapper = getWrapper()
        await enterQuota(wrapper, input)
        expect(wrapper.emitted('selectedOptionChange')).toBeUndefined()
        expect(selectedLabel(wrapper)).toBe('10 GB')
        expect(wrapper.find('.oc-text-input-danger').exists()).toBe(true)
      }
    )

    it.each(['0', '0.0', '0,0', '5'])('rejects "%s" when a maximum rules it out', async (input) => {
      const wrapper = getWrapper({ totalQuota: 2e9, maxQuota: 4e9 })
      await enterQuota(wrapper, input)
      expect(wrapper.emitted('selectedOptionChange')).toBeUndefined()
      expect(selectedLabel(wrapper)).toBe('2 GB')
    })

    it('accepts a custom quota equal to the maximum', async () => {
      const wrapper = getWrapper({ totalQuota: 2e9, maxQuota: 4e9 })
      await enterQuota(wrapper, '4')
      expect(wrapper.emitted('selectedOptionChange')).toEqual([
        [{ displayValue: '4 GB', value: 4e9 }]
      ])
    })

    it('uses the existing safety limit when no maximum is configured', async () => {
      const wrapper = getWrapper()
      await enterQuota(wrapper, '1000001')
      expect(wrapper.emitted('selectedOptionChange')).toBeUndefined()
    })
  })

  it.each(['disabled', 'readOnly'])('does not allow changes when %s', async (attribute) => {
    const wrapper = getWrapper({ [attribute]: true })
    const search = wrapper.find('input.vs__search')
    expect((search.element as HTMLInputElement).disabled).toBe(true)
    await search.trigger('click')
    expect(wrapper.find('.vs__dropdown-option').exists()).toBe(false)
    expect(wrapper.emitted('selectedOptionChange')).toBeUndefined()
  })

  it('updates translated labels when the language changes', async () => {
    const gettext = createGettext({
      translations: { de: { Default: 'Standard', 'No restriction': 'Keine Beschränkung' } },
      silent: true
    })
    const wrapper = getWrapper({ totalQuota: null, allowDefault: true }, gettext)
    gettext.current = 'de'
    await wrapper.vm.$nextTick()
    expect(selectedLabel(wrapper)).toBe('Standard')
    await openSelect(wrapper)
    expect(optionLabels(wrapper).at(-1)).toBe('Keine Beschränkung')
  })
})

type Wrapper = ReturnType<typeof getWrapper>

function selectedLabel(wrapper: Wrapper) {
  return wrapper.find('.vs__selected').text()
}

function optionLabels(wrapper: Wrapper) {
  return wrapper.findAll('.vs__dropdown-option').map((option) => option.text())
}

async function openSelect(wrapper: Wrapper) {
  const search = wrapper.find('input.vs__search')
  await search.trigger('click')
  await search.trigger('focus')
}

async function chooseOption(wrapper: Wrapper, label: string) {
  await openSelect(wrapper)
  await wrapper
    .findAll('.vs__dropdown-option')
    .find((option) => option.text() === label)
    .trigger('click')
}

async function enterQuota(wrapper: Wrapper, input: string) {
  const search = wrapper.find('input.vs__search')
  await openSelect(wrapper)
  await search.setValue(input)
  await search.trigger('keydown', { key: 'Enter', keyCode: 13 })
}

function getWrapper(
  props: {
    totalQuota?: number | null
    maxQuota?: number
    allowDefault?: boolean
    disabled?: boolean
    readOnly?: boolean
  } = {},
  gettext?: ReturnType<typeof createGettext>
) {
  return mount(QuotaSelect, {
    props: { totalQuota: 10e9, ...props },
    global: {
      plugins: [...defaultPlugins({ gettext: !gettext }), ...(gettext ? [gettext] : [])]
    }
  })
}
