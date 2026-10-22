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

  it('does not label a default without a default quota', async () => {
    const wrapper = getWrapper()
    await openSelect(wrapper)
    expect(optionLabels(wrapper).some((label) => label.includes('Default'))).toBe(false)
  })

  describe('default quota when creating', () => {
    it.each([0, 4e9])(
      'preselects the default with its value independently of the maximum %i',
      async (maxQuota) => {
        const wrapper = getWrapper({
          totalQuota: null,
          allowDefault: true,
          defaultQuota: 1e9,
          maxQuota
        })
        expect(selectedLabel(wrapper)).toBe('1 GB (Default)')
        await openSelect(wrapper)
        expect(optionLabels(wrapper)[0]).toBe('1 GB (Default)')
        expect(wrapper.emitted('selectedOptionChange')).toBeUndefined()
      }
    )

    it('shows a default that equals a preset only once', async () => {
      const wrapper = getWrapper({ totalQuota: null, allowDefault: true, defaultQuota: 1e9 })
      await openSelect(wrapper)
      expect(optionLabels(wrapper)).toEqual([
        '1 GB (Default)',
        '2 GB',
        '5 GB',
        '10 GB',
        '50 GB',
        '100 GB',
        'No restriction'
      ])
    })

    it('adds a default that is not a preset in its sorted position', async () => {
      const wrapper = getWrapper({ totalQuota: null, allowDefault: true, defaultQuota: 20e9 })
      expect(selectedLabel(wrapper)).toBe('20 GB (Default)')
      await openSelect(wrapper)
      expect(optionLabels(wrapper)).toEqual([
        '1 GB',
        '2 GB',
        '5 GB',
        '10 GB',
        '20 GB (Default)',
        '50 GB',
        '100 GB',
        'No restriction'
      ])
    })

    it.each([
      [0, ['1 GB', '2 GB', '5 GB', '10 GB', '50 GB', '100 GB', 'No restriction (Default)']],
      [4e9, ['1 GB', '2 GB', 'No restriction (Default)']]
    ])(
      'shows an unlimited default as a single option with maximum %i',
      async (maxQuota, labels) => {
        const wrapper = getWrapper({
          totalQuota: null,
          allowDefault: true,
          defaultQuota: 0,
          maxQuota
        })
        expect(selectedLabel(wrapper)).toBe('No restriction (Default)')
        await openSelect(wrapper)
        expect(optionLabels(wrapper)).toEqual(labels)
        expect(wrapper.find('.vs__dropdown-option--disabled').exists()).toBe(false)
      }
    )

    it('preselects a default above the maximum', async () => {
      const wrapper = getWrapper({
        totalQuota: null,
        allowDefault: true,
        defaultQuota: 20e9,
        maxQuota: 4e9
      })
      expect(selectedLabel(wrapper)).toBe('20 GB (Default)')
      await openSelect(wrapper)
      expect(optionLabels(wrapper)).toEqual(['1 GB', '2 GB', '20 GB (Default)'])
    })

    it('keeps a default above the maximum selectable without a limit error', async () => {
      const wrapper = getWrapper({
        totalQuota: 2e9,
        allowDefault: true,
        defaultQuota: 20e9,
        maxQuota: 4e9
      })
      await openSelect(wrapper)
      expect(optionLabels(wrapper)).toEqual(['1 GB', '2 GB', '20 GB (Default)'])

      await typeQuota(wrapper, '20')
      expect(optionLabels(wrapper)).toEqual(['20 GB (Default)'])
      expect(wrapper.find('.oc-text-input-danger').exists()).toBe(false)

      await pressEnter(wrapper)
      expect(selectedLabel(wrapper)).toBe('20 GB (Default)')
      expect(wrapper.emitted('selectedOptionChange')).toEqual([
        [{ value: null, displayValue: '20 GB (Default)', isDefault: true }]
      ])
    })

    it('can be reselected after choosing a numeric quota', async () => {
      const wrapper = getWrapper({ totalQuota: null, allowDefault: true, defaultQuota: 1e9 })
      await chooseOption(wrapper, '2 GB')
      expect(selectedLabel(wrapper)).toBe('2 GB')
      await chooseOption(wrapper, '1 GB (Default)')

      expect(selectedLabel(wrapper)).toBe('1 GB (Default)')
      expect(wrapper.emitted('selectedOptionChange')).toEqual([
        [{ value: 2e9, displayValue: '2 GB' }],
        [{ value: null, displayValue: '1 GB (Default)', isDefault: true }]
      ])
    })

    it('keeps the default separate from unlimited', async () => {
      const wrapper = getWrapper({ totalQuota: null, allowDefault: true, defaultQuota: 1e9 })
      await chooseOption(wrapper, 'No restriction')
      expect(selectedLabel(wrapper)).toBe('No restriction')
      expect(wrapper.emitted('selectedOptionChange')).toEqual([
        [{ value: 0, displayValue: 'No restriction' }]
      ])
    })

    it.each(['1', '1 GB'])('finds the default when typing "%s"', async (input) => {
      const wrapper = getWrapper({ totalQuota: 2e9, allowDefault: true, defaultQuota: 1e9 })
      await typeQuota(wrapper, input)
      expect(optionLabels(wrapper)).toContain('1 GB (Default)')
      expect(optionLabels(wrapper)).not.toContain('1 GB')
    })

    it('selects the default when typing its value', async () => {
      const wrapper = getWrapper({ totalQuota: 2e9, allowDefault: true, defaultQuota: 1e9 })
      await enterQuota(wrapper, '1')
      expect(selectedLabel(wrapper)).toBe('1 GB (Default)')
      expect(wrapper.emitted('selectedOptionChange')).toEqual([
        [{ value: null, displayValue: '1 GB (Default)', isDefault: true }]
      ])
    })

    it.each(['0', '0,0'])('selects an unlimited default for "%s"', async (input) => {
      const wrapper = getWrapper({ totalQuota: 2e9, allowDefault: true, defaultQuota: 0 })
      await enterQuota(wrapper, input)
      expect(wrapper.emitted('selectedOptionChange')).toEqual([
        [{ value: null, displayValue: 'No restriction (Default)', isDefault: true }]
      ])
    })
  })

  describe('default quota when editing', () => {
    it('labels the preset that equals the default and keeps its value', async () => {
      const wrapper = getWrapper({ totalQuota: 2e9, defaultQuota: 1e9 })
      await openSelect(wrapper)
      expect(optionLabels(wrapper)).toEqual([
        '1 GB (Default)',
        '2 GB',
        '5 GB',
        '10 GB',
        '50 GB',
        '100 GB',
        'No restriction'
      ])

      await chooseOption(wrapper, '1 GB (Default)')
      expect(wrapper.emitted('selectedOptionChange')).toEqual([
        [{ value: 1e9, displayValue: '1 GB (Default)', isDefault: true }]
      ])
    })

    it('labels the current quota when it equals the default', () => {
      const wrapper = getWrapper({ totalQuota: 1e9, defaultQuota: 1e9 })
      expect(selectedLabel(wrapper)).toBe('1 GB (Default)')
    })

    it('adds a default that is not a preset only once', async () => {
      const wrapper = getWrapper({ totalQuota: 2e9, defaultQuota: 20e9 })
      await chooseOption(wrapper, '20 GB (Default)')
      await chooseOption(wrapper, '2 GB')
      await openSelect(wrapper)
      expect(optionLabels(wrapper)).toEqual([
        '1 GB',
        '2 GB',
        '5 GB',
        '10 GB',
        '20 GB (Default)',
        '50 GB',
        '100 GB',
        'No restriction'
      ])
    })

    it('labels an unlimited default', async () => {
      const wrapper = getWrapper({ totalQuota: 0, defaultQuota: 0 })
      expect(selectedLabel(wrapper)).toBe('No restriction (Default)')
      await openSelect(wrapper)
      expect(optionLabels(wrapper).filter((label) => label.includes('No restriction'))).toEqual([
        'No restriction (Default)'
      ])
    })

    it('selects an unlimited default when typing 0', async () => {
      const wrapper = getWrapper({ totalQuota: 2e9, defaultQuota: 0 })
      await enterQuota(wrapper, '0')
      expect(wrapper.emitted('selectedOptionChange')).toEqual([
        [{ value: 0, displayValue: 'No restriction (Default)', isDefault: true }]
      ])
    })

    it('respects the maximum for the default', async () => {
      const wrapper = getWrapper({ totalQuota: 2e9, defaultQuota: 20e9, maxQuota: 4e9 })
      await openSelect(wrapper)
      expect(optionLabels(wrapper)).toEqual(['1 GB', '2 GB'])

      await wrapper.setProps({ totalQuota: 20e9 })
      const current = wrapper.findAll('.vs__dropdown-option').at(-1)
      expect(current.text()).toBe('20 GB (Default)')
      expect(current.classes()).toContain('vs__dropdown-option--disabled')
    })
  })

  describe('typing a value and pressing Enter', () => {
    it.each(['0', '0.0', '0,0'])('selects unlimited for "%s"', async (input) => {
      const wrapper = getWrapper({ totalQuota: 2e9, allowDefault: true, defaultQuota: 1e9 })
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

    describe('matching a typed number to an option', () => {
      it.each([
        ['0.013', true, null],
        ['0,013', true, null],
        ['0.013', false, 13e6],
        ['0,013', false, 13e6]
      ])(
        'finds and selects a default of 13 MB for "%s" with allowDefault %s',
        async (input, allowDefault, value) => {
          const wrapper = getWrapper({ totalQuota: 5e9, allowDefault, defaultQuota: 13e6 })
          await typeQuota(wrapper, input)
          expect(optionLabels(wrapper)).toEqual(['13 MB (Default)'])

          await pressEnter(wrapper)
          expect(selectedLabel(wrapper)).toBe('13 MB (Default)')
          expect(wrapper.emitted('selectedOptionChange')).toEqual([
            [{ value, displayValue: '13 MB (Default)', isDefault: true }]
          ])
        }
      )

      it('finds a preset typed in decimal form', async () => {
        const wrapper = getWrapper({ totalQuota: 5e9 })
        await enterQuota(wrapper, '1.0')
        expect(selectedLabel(wrapper)).toBe('1 GB')
        expect(wrapper.emitted('selectedOptionChange')).toEqual([
          [{ value: 1e9, displayValue: '1 GB' }]
        ])
      })

      it.each([true, false])(
        'prefers 1 GB over a 13 MB default for "1" with allowDefault %s',
        async (allowDefault) => {
          const wrapper = getWrapper({ totalQuota: 5e9, allowDefault, defaultQuota: 13e6 })
          await enterQuota(wrapper, '1')
          expect(selectedLabel(wrapper)).toBe('1 GB')
          expect(wrapper.emitted('selectedOptionChange')).toEqual([
            [{ value: 1e9, displayValue: '1 GB' }]
          ])
        }
      )

      it('prefers 1 GB over a 100 MB custom quota for "1"', async () => {
        const wrapper = getWrapper({ totalQuota: 1e8 })
        await enterQuota(wrapper, '1')
        expect(selectedLabel(wrapper)).toBe('1 GB')
        expect(wrapper.emitted('selectedOptionChange')).toEqual([
          [{ value: 1e9, displayValue: '1 GB' }]
        ])
      })

      it('keeps a whole number as a separate custom quota', async () => {
        const wrapper = getWrapper({ totalQuota: 5e9, allowDefault: true, defaultQuota: 13e6 })
        await enterQuota(wrapper, '13')
        expect(selectedLabel(wrapper)).toBe('13 GB')
        expect(wrapper.emitted('selectedOptionChange')).toEqual([
          [{ value: 13e9, displayValue: '13 GB' }]
        ])
      })
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

    it.each(['1,0,0', '1,', '0,0000000001'])(
      'shows the invalid input "%s" as typed',
      async (input) => {
        const wrapper = getWrapper()
        await typeQuota(wrapper, input)
        expect(wrapper.find('.vs__dropdown-option span').text()).toBe(input)
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
      translations: {
        de: { '%{quota} (Default)': '%{quota} (Standard)', 'No restriction': 'Keine Beschränkung' }
      },
      silent: true
    })
    const wrapper = getWrapper({ totalQuota: null, allowDefault: true, defaultQuota: 1e9 }, gettext)
    gettext.current = 'de'
    await wrapper.vm.$nextTick()
    expect(selectedLabel(wrapper)).toBe('1 GB (Standard)')
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

async function typeQuota(wrapper: Wrapper, input: string) {
  await openSelect(wrapper)
  await wrapper.find('input.vs__search').setValue(input)
}

async function pressEnter(wrapper: Wrapper) {
  await wrapper.find('input.vs__search').trigger('keydown', { key: 'Enter', keyCode: 13 })
}

async function enterQuota(wrapper: Wrapper, input: string) {
  await typeQuota(wrapper, input)
  await pressEnter(wrapper)
}

function getWrapper(
  props: {
    totalQuota?: number | null
    maxQuota?: number
    defaultQuota?: number
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
