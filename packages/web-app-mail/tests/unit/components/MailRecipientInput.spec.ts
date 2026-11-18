import { ref } from 'vue'
import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import MailRecipientInput from '../../../src/components/MailRecipientInput.vue'
import { useRecipientSuggestions } from '../../../src/composables/useRecipientSuggestions'

vi.mock('../../../src/composables/useRecipientSuggestions')

const suggestions = [
  { name: 'Ada Lovelace', email: 'ada@example.org' },
  { name: 'Adam Smith', email: 'adam@example.org' }
]

describe('MailRecipientInput', () => {
  it('searches suggestions for the last recipient', async () => {
    const { wrapper, searchSuggestions } = getWrapper({ suggestions: [] })
    await wrapper.find('input').setValue('grace@example.org, ad')

    expect(searchSuggestions).toHaveBeenCalledWith('account', 'ad', ['grace@example.org'])
  })

  it('renders the suggestions as listbox', () => {
    const { wrapper } = getWrapper()
    const input = wrapper.find('input')
    expect(input.attributes('aria-expanded')).toBe('true')
    expect(wrapper.findAll('[role="option"]')).toHaveLength(2)
  })

  it('replaces the last recipient with the selected suggestion', async () => {
    const { wrapper } = getWrapper({ modelValue: 'grace@example.org, ad' })
    await wrapper.findAll('[role="option"]')[1].trigger('mousedown')

    expect(wrapper.emitted('update:modelValue').at(-1)).toEqual([
      'grace@example.org, adam@example.org, '
    ])
  })

  it('selects suggestions with the keyboard', async () => {
    const { wrapper } = getWrapper({ modelValue: 'ad' })
    const input = wrapper.find('input')
    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('update:modelValue').at(-1)).toEqual(['adam@example.org, '])
  })

  it('closes the suggestions on escape', async () => {
    const { wrapper } = getWrapper()
    await wrapper.find('input').trigger('keydown', { key: 'Escape' })

    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
  })
})

function getWrapper({
  modelValue = '',
  suggestions: currentSuggestions = suggestions
}: { modelValue?: string; suggestions?: typeof suggestions } = {}) {
  const searchSuggestions = vi.fn()
  vi.mocked(useRecipientSuggestions).mockReturnValue({
    suggestions: ref(currentSuggestions),
    searchSuggestions,
    clearSuggestions: vi.fn()
  } as unknown as ReturnType<typeof useRecipientSuggestions>)

  return {
    searchSuggestions,
    wrapper: mount(MailRecipientInput, {
      props: { modelValue, label: 'To:', accountId: 'account' },
      global: { plugins: [...defaultPlugins()] }
    })
  }
}
