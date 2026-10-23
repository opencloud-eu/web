import { unref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useContactsStore } from '../../../../src/composables/piniaStores/contacts'
import type { Contact } from '../../../../src/types'

describe('contacts store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('upsertContact', () => {
    it('adds a new contact', () => {
      const store = useContactsStore()
      store.upsertContact({ id: 'contact-1' })

      expect(unref(store.contacts)).toEqual([{ id: 'contact-1' }])
    })

    it('replaces an existing contact without keeping removed properties', () => {
      const store = useContactsStore()
      const contact: Contact = {
        id: 'contact-1',
        nicknames: { k1: { name: 'Countess' } },
        notes: { n1: { note: 'First programmer.' } }
      }
      store.upsertContact(contact)
      store.upsertContact({ id: 'contact-1', notes: { n1: { note: 'Mathematician.' } } })

      expect(unref(store.contacts)).toEqual([
        { id: 'contact-1', notes: { n1: { note: 'Mathematician.' } } }
      ])
    })
  })
})
