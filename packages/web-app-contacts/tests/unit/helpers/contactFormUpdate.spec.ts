import {
  createContactFormState,
  createContactUpdatePayload,
  type ContactFormState
} from '../../../src/helpers/contactForm'
import type { Contact } from '../../../src/types'

const contact: Contact = {
  id: 'c1',
  name: {
    full: 'Ada Lovelace',
    components: [
      { kind: 'title', value: 'Countess' },
      { kind: 'given', value: 'Ada' },
      { kind: 'surname', value: 'Lovelace' }
    ]
  },
  nicknames: { n1: { name: 'Enchantress' } },
  emails: {
    home: { address: 'ada@example.org', contexts: { private: true }, pref: 1 },
    office: { address: 'ada@work.example', contexts: { work: true } }
  },
  phones: {
    cell: { number: '+44 1', contexts: { work: true }, features: { mobile: true, text: true } }
  },
  addresses: {
    a1: {
      components: [
        { kind: 'name', value: 'St James Square' },
        { kind: 'number', value: '12' },
        { kind: 'postcode', value: 'SW1Y 4JH' },
        { kind: 'locality', value: 'London' },
        { kind: 'apartment', value: '3' }
      ],
      contexts: { private: true }
    }
  },
  organizations: { org: { name: 'Analytical Engine Ltd', units: [{ name: 'Research' }] } },
  titles: { t: { name: 'Mathematician' } },
  notes: { n: { note: 'First programmer.' } }
}

const getStates = () => {
  const initialState = createContactFormState(contact)
  return { initialState, state: structuredClone(initialState) }
}

const createPayload = (change: (state: ContactFormState) => void) => {
  const { initialState, state } = getStates()
  change(state)
  return createContactUpdatePayload(state, initialState, contact)
}

describe('createContactFormState', () => {
  it('maps a contact to the form state', () => {
    expect(createContactFormState(contact)).toEqual({
      firstName: 'Ada',
      lastName: 'Lovelace',
      nickname: 'Enchantress',
      emails: [
        { key: 'home', value: 'ada@example.org', context: 'private' },
        { key: 'office', value: 'ada@work.example', context: 'work' }
      ],
      phones: [{ key: 'cell', value: '+44 1', context: 'mobile' }],
      addresses: [
        {
          key: 'a1',
          street: 'St James Square 12',
          postcode: 'SW1Y 4JH',
          locality: 'London',
          region: '',
          country: '',
          context: 'private'
        }
      ],
      organization: 'Analytical Engine Ltd',
      department: 'Research',
      jobTitle: 'Mathematician',
      note: 'First programmer.'
    })
  })

  it('uses the full name if the contact has no name components', () => {
    const state = createContactFormState({ id: 'c2', name: { full: 'Grace Hopper' } })
    expect(state.firstName).toBe('Grace Hopper')
    expect(state.lastName).toBe('')
  })

  it('adds an empty email and phone entry to contacts without any', () => {
    const state = createContactFormState({ id: 'c2' })
    expect(state.emails).toEqual([expect.objectContaining({ value: '' })])
    expect(state.phones).toEqual([expect.objectContaining({ value: '' })])
  })
})

describe('createContactUpdatePayload', () => {
  it('is empty if nothing changed', () => {
    expect(createPayload(() => undefined)).toEqual({})
  })

  it('only contains the changed property', () => {
    const payload = createPayload((state) => {
      state.note = 'Changed'
    })
    expect(payload).toEqual({ notes: { n: { note: 'Changed' } } })
  })

  it('keeps other name components and drops the outdated full name', () => {
    const payload = createPayload((state) => {
      state.firstName = 'Augusta Ada'
    })
    expect(payload).toEqual({
      name: {
        components: [
          { kind: 'given', value: 'Augusta Ada' },
          { kind: 'title', value: 'Countess' },
          { kind: 'surname', value: 'Lovelace' }
        ]
      }
    })
  })

  it('keeps untouched emails and unknown fields of changed emails', () => {
    const payload = createPayload((state) => {
      state.emails[0].value = 'ada@new.example'
      state.emails[0].context = 'other'
    })
    expect(payload).toEqual({
      emails: {
        home: { address: 'ada@new.example', pref: 1 },
        office: contact.emails.office
      }
    })
  })

  it('removes deleted and adds new emails', () => {
    const payload = createPayload((state) => {
      state.emails = [state.emails[1], { key: 'e9', value: 'new@example.org', context: 'work' }]
    })
    expect(payload).toEqual({
      emails: {
        office: contact.emails.office,
        e9: { address: 'new@example.org', contexts: { work: true } }
      }
    })
  })

  it('keeps the context of mobile numbers and other phone features', () => {
    const payload = createPayload((state) => {
      state.phones[0].value = '+44 2'
    })
    expect(payload).toEqual({
      phones: {
        cell: { number: '+44 2', contexts: { work: true }, features: { mobile: true, text: true } }
      }
    })
  })

  it('removes the mobile feature if another type is chosen', () => {
    const payload = createPayload((state) => {
      state.phones[0].context = 'private'
    })
    expect(payload).toEqual({
      phones: { cell: { number: '+44 1', contexts: { private: true }, features: { text: true } } }
    })
  })

  it('keeps address components the form does not know', () => {
    const payload = createPayload((state) => {
      state.addresses[0].locality = 'Marylebone'
    })
    expect(payload).toEqual({
      addresses: {
        a1: {
          components: [
            { kind: 'name', value: 'St James Square 12' },
            { kind: 'postcode', value: 'SW1Y 4JH' },
            { kind: 'locality', value: 'Marylebone' },
            { kind: 'apartment', value: '3' }
          ],
          contexts: { private: true }
        }
      }
    })
  })

  it('updates the first organization and title', () => {
    const payload = createPayload((state) => {
      state.department = 'Engineering'
      state.jobTitle = 'Programmer'
    })
    expect(payload).toEqual({
      organizations: { org: { name: 'Analytical Engine Ltd', units: [{ name: 'Engineering' }] } },
      titles: { t: { name: 'Programmer', kind: 'title' } }
    })
  })

  it('removes the nickname if it was cleared', () => {
    const payload = createPayload((state) => {
      state.nickname = ''
    })
    expect(payload).toEqual({ nicknames: {} })
  })
})
