import {
  createContactPayload,
  createEmptyContactFormState,
  hasContactFormValue,
  hasInvalidContactEmail,
  type ContactFormState
} from '../../../src/helpers/contactForm'

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
        titles: { t1: { name: 'Mathematician', kind: 'title' } },
        notes: { n1: { note: 'First programmer.' } }
      })
    })
  })
})
