import { ref, unref } from 'vue'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { useContactSearch } from '../../../src/composables/useContactSearch'
import type { Contact } from '../../../src/types'

const contacts: Contact[] = [
  {
    id: '1',
    name: { full: 'Ada Lovelace' },
    nicknames: { k: { name: 'Countess' } },
    organizations: { o: { name: 'Analytical Engine Ltd', units: [{ name: 'Research' }] } },
    addresses: { a: { components: [{ kind: 'locality', value: 'London' }] } }
  },
  {
    id: '2',
    name: { full: 'Grace Hopper' },
    emails: { e: { address: 'grace@navy.example' } },
    phones: { p: { number: '+1 555 0100' } }
  }
]

describe('useContactSearch', () => {
  it.each([
    ['lovelace', ['1']],
    ['navy', ['2']],
    ['555', ['2']],
    ['countess', ['1']],
    ['analytical', ['1']],
    ['research', ['1']],
    ['london', ['1']],
    ['', ['1', '2']]
  ])('finds contacts by "%s"', (term, ids) => {
    getComposableWrapper(() => {
      const { searchTerm, filteredContacts } = useContactSearch(ref(contacts))
      searchTerm.value = term
      expect(unref(filteredContacts).map(({ id }) => id)).toEqual(ids)
    })
  })
})
