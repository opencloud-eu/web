import { defaultPlugins, mount } from '@opencloud-eu/web-test-helpers'
import ContactFormEntryList from '../../../src/components/ContactFormEntryList.vue'
import type { ContactFormEmail } from '../../../src/helpers/contactForm'

const entries: ContactFormEmail[] = [
  { key: 'e1', value: 'ada@example.org', context: 'private' },
  { key: 'e2', value: 'ada@work.example', context: 'work' }
]

describe('ContactFormEntryList', () => {
  it('renders one row per entry', () => {
    const { wrapper } = getWrapper()
    expect(wrapper.findAll('[data-testid^="contact-form-entry-"]')).toHaveLength(2)
  })

  it('adds a new entry', async () => {
    const { wrapper } = getWrapper()
    const addButton = wrapper.findAll('button').find((b) => b.text() === 'Add email address')
    await addButton.trigger('click')

    expect(wrapper.emitted('update:entries')[0][0]).toEqual([
      ...entries,
      { key: 'e3', value: '', context: 'private' }
    ])
  })

  it('removes an entry', async () => {
    const { wrapper } = getWrapper()
    await wrapper.find('[aria-label="Remove email address"]').trigger('click')

    expect(wrapper.emitted('update:entries')[0][0]).toEqual([entries[1]])
  })

  it('updates the value of an entry', async () => {
    const { wrapper } = getWrapper()
    await wrapper.findAll('input[type="email"]')[1].setValue('ada@new.example')

    expect(wrapper.emitted('update:entries')[0][0]).toEqual([
      entries[0],
      { ...entries[1], value: 'ada@new.example' }
    ])
  })

  it('passes the error message of each value to its input', () => {
    const { wrapper } = getWrapper({
      getErrorMessage: (value: string) => (value.endsWith('.org') ? 'invalid' : '')
    })
    const inputs = wrapper.findAllComponents({ name: 'OcTextInput' })
    expect(inputs.map((input) => input.props('errorMessage'))).toEqual(['invalid', ''])
  })
})

function getWrapper(props: { getErrorMessage?: (value: string) => string } = {}) {
  return {
    wrapper: mount(ContactFormEntryList, {
      props: {
        entries,
        contextOptions: [
          { value: 'private', label: 'Private' },
          { value: 'work', label: 'Work' }
        ],
        createEntry: () => ({ key: 'e3', value: '', context: 'private' }),
        title: 'Email addresses',
        inputLabel: 'Email',
        addLabel: 'Add email address',
        removeLabel: 'Remove email address',
        inputType: 'email',
        ...props
      },
      global: { plugins: [...defaultPlugins()] }
    })
  }
}
