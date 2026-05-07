import { computed, ref, unref, type Ref, type ComputedRef } from 'vue'
import { Contact } from '../types'

export type HighlightedTextPart = {
  text: string
  highlight: boolean
}

const toSearchStrings = (value: unknown): string[] => {
  if (value === null || value === undefined) {
    return []
  }

  if (Array.isArray(value)) {
    return value.flatMap(toSearchStrings)
  }

  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap(toSearchStrings)
  }

  return [String(value)]
}

const getContactSearchValues = (contact: Contact): string[] => {
  return toSearchStrings(contact)
    .filter(Boolean)
    .map((value) => value.trim())
}

const escapeRegExp = (value: string) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function useContactSearch(contacts: Ref<Contact[]> | ComputedRef<Contact[]>) {
  const searchTerm = ref('')

  const normalizedSearchTerm = computed(() => {
    return searchTerm.value.trim().toLowerCase()
  })

  const filteredContacts = computed(() => {
    if (!normalizedSearchTerm.value) {
      return unref(contacts)
    }

    return unref(contacts).filter((contact) =>
      getContactSearchValues(contact).some((value) =>
        value.toLowerCase().includes(normalizedSearchTerm.value)
      )
    )
  })

  const getMatchingContactValues = (contact: Contact): string[] => {
    return getContactSearchValues(contact).filter((value) =>
      value.toLowerCase().includes(normalizedSearchTerm.value)
    )
  }

  const getHighlightedTextParts = (value: string): HighlightedTextPart[] => {
    const term = normalizedSearchTerm.value

    if (!term) {
      return [{ text: value, highlight: false }]
    }

    const searchTermRegex = new RegExp(`(${escapeRegExp(term)})`, 'gi')

    return value
      .split(searchTermRegex)
      .filter(Boolean)
      .map((text) => ({
        text,
        highlight: text.toLowerCase() === term
      }))
  }

  return {
    searchTerm,
    normalizedSearchTerm,
    filteredContacts,
    getMatchingContactValues,
    getHighlightedTextParts
  }
}
