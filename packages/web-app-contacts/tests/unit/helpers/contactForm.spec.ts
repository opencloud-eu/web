import {
  createContactFormState,
  createContactPayload,
  createContactUpdatePayload,
  createEmptyContactFormState,
  createEntryKey,
  getNotRemovedProperties,
  hasContactFormValue,
  hasInvalidContactEmail,
  type ContactFormState
} from '../../../src/helpers/contactForm'
import type { Contact } from '../../../src/types'

const getState = (state: Partial<ContactFormState> = {}): ContactFormState => ({
  ...createEmptyContactFormState(),
  ...state
})

describe('contactForm helpers', () => {
  describe('hasContactFormValue', () => {
    it('returns false for an empty form', () => {
      expect(hasContactFormValue(getState())).toBe(false)
    })

    it.each<Partial<ContactFormState>>([
      { firstName: 'Ada' },
      { note: 'note' },
      { emails: [{ key: 'e1', value: 'ada@example.org', context: 'private' }] },
      { phones: [{ key: 'p1', value: '123', context: 'mobile' }] },
      {
        addresses: [
          {
            key: 'a1',
            street: '',
            postcode: '',
            locality: 'London',
            region: '',
            country: '',
            context: 'private'
          }
        ]
      }
    ])('returns true if a field is filled: %o', (state) => {
      expect(hasContactFormValue(getState(state))).toBe(true)
    })

    it('ignores whitespace', () => {
      expect(hasContactFormValue(getState({ firstName: '  ' }))).toBe(false)
    })
  })

  describe('hasInvalidContactEmail', () => {
    it('ignores empty email entries', () => {
      expect(hasInvalidContactEmail(getState())).toBe(false)
    })

    it('detects an invalid email in any entry', () => {
      const state = getState({
        emails: [
          { key: 'e1', value: 'ada@example.org', context: 'private' },
          { key: 'e2', value: 'invalid', context: 'work' }
        ]
      })
      expect(hasInvalidContactEmail(state)).toBe(true)
    })
  })

  describe('createContactPayload', () => {
    it('only contains the address book and kind for an empty form', () => {
      expect(createContactPayload(getState(), 'book-1')).toEqual({
        addressBookIds: { 'book-1': true },
        kind: 'individual'
      })
    })

    it('maps all fields to JSContact', () => {
      const state = getState({
        firstName: ' Ada ',
        lastName: 'Lovelace',
        nickname: 'Countess',
        emails: [
          { key: 'e1', value: 'ada@example.org', context: 'private' },
          { key: 'e2', value: 'ada@work.example', context: 'work' },
          { key: 'e3', value: '', context: 'other' }
        ],
        phones: [
          { key: 'p1', value: '+44 1', context: 'mobile' },
          { key: 'p2', value: '+44 2', context: 'other' }
        ],
        addresses: [
          {
            key: 'a1',
            street: '12 St James Square',
            postcode: 'SW1Y 4JH',
            locality: 'London',
            region: '',
            country: 'United Kingdom',
            context: 'work'
          }
        ],
        organization: 'Analytical Engine Ltd',
        department: 'Research',
        jobTitle: 'Mathematician',
        note: 'First programmer.'
      })

      expect(createContactPayload(state, 'book-1')).toEqual({
        addressBookIds: { 'book-1': true },
        kind: 'individual',
        name: {
          components: [
            { kind: 'given', value: 'Ada' },
            { kind: 'surname', value: 'Lovelace' }
          ]
        },
        nicknames: { k1: { name: 'Countess' } },
        emails: {
          e1: { address: 'ada@example.org', contexts: { private: true } },
          e2: { address: 'ada@work.example', contexts: { work: true } }
        },
        phones: {
          p1: { number: '+44 1', features: { mobile: true } },
          p2: { number: '+44 2' }
        },
        addresses: {
          a1: {
            components: [
              { kind: 'name', value: '12 St James Square' },
              { kind: 'postcode', value: 'SW1Y 4JH' },
              { kind: 'locality', value: 'London' },
              { kind: 'country', value: 'United Kingdom' }
            ],
            contexts: { work: true }
          }
        },
        organizations: { o1: { name: 'Analytical Engine Ltd', units: [{ name: 'Research' }] } },
        titles: { t1: { name: 'Mathematician', kind: 'title', organizationId: 'o1' } },
        notes: { n1: { note: 'First programmer.' } }
      })
    })
  })
  describe('createEntryKey', () => {
    it('creates unique keys that differ from the simple keys of saved contacts', () => {
      const keys = Array.from({ length: 20 }, () => createEntryKey('e'))
      expect(new Set(keys).size).toBe(keys.length)
      for (const key of keys) {
        expect(key).toMatch(/^e-/)
        expect(['e1', 'e2', 'e3']).not.toContain(key)
      }
    })
  })

  describe('createContactPayload organization', () => {
    it('omits the organization name if only a department is set', () => {
      expect(
        createContactPayload(getState({ department: 'Research' }), 'ab-1').organizations
      ).toEqual({
        o1: { units: [{ name: 'Research' }] }
      })
    })

    it('does not link a job title without organization', () => {
      expect(createContactPayload(getState({ jobTitle: 'Mathematician' }), 'ab-1').titles).toEqual({
        t1: { name: 'Mathematician', kind: 'title' }
      })
    })
  })
})

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
      full: 'St James Square 12, SW1Y 4JH London',
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
            { kind: 'name', value: 'St James Square' },
            { kind: 'number', value: '12' },
            { kind: 'apartment', value: '3' },
            { kind: 'postcode', value: 'SW1Y 4JH' },
            { kind: 'locality', value: 'Marylebone' }
          ],
          contexts: { private: true }
        }
      }
    })
  })

  it('writes a changed street as one component and drops the outdated full address', () => {
    const payload = createPayload((state) => {
      state.addresses[0].street = 'Pall Mall 1'
    })
    expect(payload.addresses.a1.components).toEqual([
      { kind: 'name', value: 'Pall Mall 1' },
      { kind: 'apartment', value: '3' },
      { kind: 'postcode', value: 'SW1Y 4JH' },
      { kind: 'locality', value: 'London' }
    ])
    expect(payload.addresses.a1).not.toHaveProperty('full')
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

  it('keeps the kind of an existing title', () => {
    const { initialState, state } = getStates()
    state.jobTitle = 'Countess'
    const payload = createContactUpdatePayload(state, initialState, {
      ...contact,
      titles: { t: { name: 'Mathematician', kind: 'role' } }
    })
    expect(payload.titles).toEqual({ t: { name: 'Countess', kind: 'role' } })
  })

  it('removes the nickname if it was cleared', () => {
    const payload = createPayload((state) => {
      state.nickname = ''
    })
    expect(payload).toEqual({ nicknames: {} })
  })
})

describe('getNotRemovedProperties', () => {
  it('returns the properties that still have entries removed in the form', () => {
    expect(
      getNotRemovedProperties(
        { emails: { e1: { address: 'ada@example.org' } }, nicknames: {}, notes: {} },
        {
          id: 'c1',
          emails: { e1: { address: 'ada@example.org' }, e2: { address: 'old@example.org' } },
          nicknames: { k1: { name: 'Countess' } }
        }
      )
    ).toEqual(['nicknames', 'emails'])
  })

  it('ignores properties that were not part of the update', () => {
    expect(
      getNotRemovedProperties(
        { notes: {} },
        { id: 'c1', emails: { e1: { address: 'ada@example.org' } } }
      )
    ).toEqual([])
  })
})
