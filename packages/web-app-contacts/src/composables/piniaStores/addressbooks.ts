import { defineStore } from 'pinia'
import { computed, ref, unref } from 'vue'
import { AddressBook } from '../../types'
import { useRouteQuery } from '@opencloud-eu/web-pkg/src'

export const useAddressBooksStore = defineStore('addressBooks', () => {
  const currentAddressBookIdQuery = useRouteQuery('addressBookId')

  const addressBooks = ref<AddressBook[]>([])
  const currentAddressBookId = ref<string>()

  const currentAddressBook = computed(() =>
    unref(addressBooks).find((addressBook) => addressBook.id === unref(currentAddressBookId))
  )

  const setAddressBooks = (data: AddressBook[]) => {
    addressBooks.value = data
  }

  const upsertAddressBook = (data: AddressBook) => {
    const existing = unref(addressBooks).find(({ id }) => id === data.id)
    if (existing) {
      Object.assign(existing, data)
      return
    }
    unref(addressBooks).push(data)
  }

  const removeAddressBooks = (values: AddressBook[]) => {
    addressBooks.value = unref(addressBooks).filter(
      (addressBook) => !values.find(({ id }) => id === addressBook.id)
    )

    if (values.some((v) => v.id === unref(currentAddressBookId))) {
      currentAddressBookId.value = null
      currentAddressBookIdQuery.value = null
    }
  }

  const setCurrentAddressBook = (data: AddressBook) => {
    currentAddressBookId.value = data?.id
    currentAddressBookIdQuery.value = data?.id
  }

  const updateAddressBookField = <T extends AddressBook>({
    id,
    field,
    value
  }: {
    id: T['id']
    field: keyof T
    value: T[keyof T]
  }) => {
    const addressBook = unref(addressBooks).find((addressBook) => id === addressBook.id) as T
    if (addressBook) {
      addressBook[field] = value
    }
  }

  const reset = () => {
    addressBooks.value = []
    currentAddressBookId.value = null
    currentAddressBookIdQuery.value = null
  }

  return {
    addressBooks,
    currentAddressBook,
    updateAddressBookField,
    setAddressBooks,
    upsertAddressBook,
    removeAddressBooks,
    setCurrentAddressBook,
    reset
  }
})

export type AddressBooksStore = ReturnType<typeof useAddressBooksStore>
