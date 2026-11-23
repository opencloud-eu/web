import { defineStore } from 'pinia'
import { computed, ref, unref } from 'vue'
import { Contact } from '../../types'
import { useRouteQuery } from '@opencloud-eu/web-pkg'

export const useContactsStore = defineStore('contacts', () => {
  const currentContactIdQuery = useRouteQuery('contactId')

  const contacts = ref<Contact[]>([])
  const currentContactId = ref<string>()

  const currentContact = computed(() =>
    unref(contacts).find((contact) => contact.id === unref(currentContactId))
  )

  const setContacts = (data: Contact[]) => {
    contacts.value = data
  }

  const upsertContact = (data: Contact) => {
    const index = unref(contacts).findIndex(({ id }) => id === data.id)
    if (index !== -1) {
      // replace the contact, properties missing in the new data must not be kept
      unref(contacts).splice(index, 1, data)
      return
    }
    unref(contacts).push(data)
  }

  const removeContacts = (values: Contact[]) => {
    contacts.value = unref(contacts).filter(
      (contact) => !values.find(({ id }) => id === contact.id)
    )

    if (values.some((v) => v.id === unref(currentContactId))) {
      currentContactId.value = null
      currentContactIdQuery.value = null
    }
  }

  const setCurrentContact = (data: Contact) => {
    currentContactId.value = data?.id
    currentContactIdQuery.value = data?.id
  }

  const updateContactField = <T extends Contact>({
    id,
    field,
    value
  }: {
    id: T['id']
    field: keyof T
    value: T[keyof T]
  }) => {
    const contact = unref(contacts).find((contact) => id === contact.id) as T
    if (contact) {
      contact[field] = value
    }
  }

  const reset = () => {
    contacts.value = []
    currentContactId.value = null
    currentContactIdQuery.value = null
  }

  return {
    contacts,
    currentContact,
    updateContactField,
    setContacts,
    upsertContact,
    removeContacts,
    setCurrentContact,
    reset
  }
})
