import { unref } from 'vue'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import {
  formatContactAddress,
  useContactDetailSections
} from '../../../src/composables/useContactDetailSections'
import type { Contact } from '../../../src/types'

const contact: Contact = {
  id: 'c1',
  name: { components: [{ kind: 'given', value: 'Ada' }] },
  emails: {
    e1: { address: 'ada@example.org', contexts: { private: true } },
    e2: { address: 'ada@work.example', contexts: { work: true } },
    e3: { address: 'ada@other.example' }
  },
  phones: {
    p1: { number: '+44 1', features: { mobile: true }, contexts: { work: true } },
    p2: { number: '+44 2', contexts: { work: true } }
  },
  addresses: {
    a1: {
      components: [
        { kind: 'name', value: 'St James Square' },
        { kind: 'number', value: '12' },
        { kind: 'postcode', value: 'SW1Y 4JH' },
        { kind: 'locality', value: 'London' },
        { kind: 'country', value: 'United Kingdom' }
      ],
      contexts: { private: true },
      countryCode: 'GB'
    }
  },
  onlineServices: {
    s1: { service: 'Website', uri: 'https://example.org/ada' },
    s2: { user: '@ada' }
  },
  organizations: {
    o1: { name: 'Analytical Engine Ltd', units: [{ name: 'Research' }] },
    o2: { name: 'Royal Society' }
  },
  titles: { t1: { name: 'Mathematician' }, t2: { name: 'Advisor', kind: 'role' } }
}

const getSection = (key: string) => {
  let section: ReturnType<typeof useContactDetailSections>['sections']['value'][number]
  getComposableWrapper(() => {
    section = unref(useContactDetailSections(contact).sections).find((s) => s.key === key)
  })
  return section
}

describe('useContactDetailSections', () => {
  it('labels emails by their context', () => {
    expect(getSection('emails').rows.map(({ label }) => label)).toEqual([
      'Private',
      'Work',
      'Email'
    ])
  })

  it('labels mobile phone numbers as mobile', () => {
    expect(getSection('phones').rows.map(({ label }) => label)).toEqual(['Mobile', 'Work'])
  })

  it('formats addresses in multiple lines', () => {
    expect(getSection('addresses').rows).toEqual([
      {
        label: 'Private',
        value: 'St James Square 12\nSW1Y 4JH London\nUnited Kingdom',
        secondary: 'GB'
      }
    ])
  })

  it('shows online services', () => {
    expect(getSection('onlineServices').rows).toEqual([
      { label: 'Website', value: 'https://example.org/ada' },
      { label: 'Online service', value: '@ada' }
    ])
  })

  it('shows all organizations and titles', () => {
    expect(getSection('organization').rows).toEqual([
      { label: 'Organization', value: 'Analytical Engine Ltd', secondary: 'Research' },
      { label: 'Organization', value: 'Royal Society', secondary: undefined },
      { label: 'Job title', value: 'Mathematician' },
      { label: 'Role', value: 'Advisor' }
    ])
  })

  it('hides empty sections and rows', () => {
    expect(getSection('basic').rows).toEqual([{ label: 'First name', value: 'Ada' }])
    expect(getSection('notes')).toBeUndefined()
  })
})

describe('formatContactAddress', () => {
  it('falls back to all components for unknown address formats', () => {
    expect(
      formatContactAddress({
        components: [
          { kind: 'postOfficeBox', value: 'PO Box 7' },
          { kind: 'separator', value: ', ' },
          { kind: 'district', value: 'Westminster' }
        ]
      })
    ).toBe('PO Box 7, Westminster')
  })
})
