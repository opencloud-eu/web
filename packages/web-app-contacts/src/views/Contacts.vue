<template>
  <div class="flex h-full items-center justify-center">
    <no-content-message id="contacts-empty" img-src="/images/empty-states/empty-contacts.svg">
      <template #message>
        <span v-text="$gettext('No contacts available yet.')" />
      </template>
    </no-content-message>
  </div>
</template>

<script setup lang="ts">
import { useGettext } from 'vue3-gettext'
import {
  NoContentMessage,
  queryItemAsString,
  useClientService,
  useGroupwareAccountsStore,
  useRouteQuery
} from '@opencloud-eu/web-pkg'
import { storeToRefs } from 'pinia'
import { onMounted, unref } from 'vue'
import { useAddressBooksStore } from '../composables/piniaStores/addressbooks'
import { useLoadAddressBooks } from '../composables/useLoadAddressbooks'
import { AddressBook } from '../types'
import { useLoadContacts } from '../composables/useLoadContacts'

const { httpAuthenticated } = useClientService()
const accountsStore = useGroupwareAccountsStore()
const { loadCurrentAccount } = accountsStore
const { currentAccount } = storeToRefs(accountsStore)
const addressBooksStore = useAddressBooksStore()
const { setCurrentAddressBook } = addressBooksStore
const { addressBooks, currentAddressBook } = storeToRefs(addressBooksStore)
const { loadAddressBooks } = useLoadAddressBooks()
const { loadContacts } = useLoadContacts()
const { $gettext } = useGettext()

const currentAccountIdQuery = useRouteQuery('accountId')
const currentAddressBookQuery = useRouteQuery('addressBookId')

const loadAddressBooksAndContacts = async () => {
  await loadAddressBooks(unref(currentAccount).accountId)

  let queryAddressBook: AddressBook | undefined
  if (unref(currentAddressBookQuery)) {
    queryAddressBook = unref(addressBooks).find(({ id }) => id === unref(currentAddressBookQuery))
  }

  setCurrentAddressBook(queryAddressBook || unref(addressBooks)?.[0])

  await loadContacts(unref(currentAccount).accountId, unref(currentAddressBook).id)
}

accountsStore.$onAction(({ after, name }) => {
  after(() => {
    if (['loadCurrentAccount', 'setCurrentAccount'].includes(name) && unref(currentAccount)) {
      currentAccountIdQuery.value = unref(currentAccount).accountId
      loadAddressBooksAndContacts()
    }
  })
})

onMounted(() => {
  loadCurrentAccount({
    client: httpAuthenticated,
    query: queryItemAsString(unref(currentAccountIdQuery))
  })
})
</script>
