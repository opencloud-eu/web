import { computed, ref, unref, type ComputedRef, type Ref } from 'vue'
import Fuse from 'fuse.js'
import { defaultFuseOptions } from '@opencloud-eu/web-pkg'
import { Contact } from '../types'
import { getContactDisplayName } from '../helpers'

const filterContacts = (contacts: Contact[], searchTerm: string) => {
  const term = searchTerm.trim()
  if (!term) return contacts

  const searchableContacts = contacts.map((contact) => ({
    displayName: getContactDisplayName(contact),
    emails: Object.values(contact.emails || {}).map((e) => e.address),
    phones: Object.values(contact.phones || {}).map((p) => p.number)
  }))

  const searchEngine = new Fuse(searchableContacts, {
    ...defaultFuseOptions,
    keys: ['displayName', 'emails', 'phones']
  })

  const resultIndices = new Set(searchEngine.search(term).map((r) => r.refIndex))
  return contacts.filter((_, index) => resultIndices.has(index))
}

export function useContactSearch(contacts: Ref<Contact[]> | ComputedRef<Contact[]>) {
  const searchTerm = ref('')

  const normalizedSearchTerm = computed(() => {
    return searchTerm.value.trim()
  })

  const filteredContacts = computed(() => {
    return filterContacts(unref(contacts), unref(normalizedSearchTerm))
  })

  return {
    searchTerm,
    normalizedSearchTerm,
    filteredContacts
  }
}
