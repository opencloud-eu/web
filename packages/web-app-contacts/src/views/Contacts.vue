<template>
  <div class="h-full">
    <div v-if="isLoading" class="flex h-full items-center justify-center">
      <app-loading-spinner />
    </div>
    <contacts-list v-else />
  </div>
</template>

<script setup lang="ts">
import {
  queryItemAsString,
  useClientService,
  useGroupwareAccountsStore,
  useRouteQuery
} from '@opencloud-eu/web-pkg'
import { storeToRefs } from 'pinia'
import { onMounted, ref, unref } from 'vue'
import { useAddressBooksStore } from '../composables/piniaStores/addressbooks'
import { useLoadAddressBooks } from '../composables/useLoadAddressbooks'
import { AddressBook } from '../types'
import { useLoadContacts } from '../composables/useLoadContacts'
import { AppLoadingSpinner } from '@opencloud-eu/web-pkg'
import ContactsList from './ContactsList.vue'

const { httpAuthenticated } = useClientService()
const accountsStore = useGroupwareAccountsStore()
const { loadCurrentAccount } = accountsStore
const { currentAccount } = storeToRefs(accountsStore)
const addressBooksStore = useAddressBooksStore()
const { setCurrentAddressBook } = addressBooksStore
const { addressBooks, currentAddressBook } = storeToRefs(addressBooksStore)
const { loadAddressBooks } = useLoadAddressBooks()
const { loadContacts } = useLoadContacts()

const isLoading = ref<boolean>(true)

const currentAccountIdQuery = useRouteQuery('accountId')
const currentAddressBookQuery = useRouteQuery('addressBookId')

const loadAddressBooksAndContacts = async () => {
  isLoading.value = true
  await loadAddressBooks(unref(currentAccount).accountId)

  let queryAddressBook: AddressBook | undefined
  if (unref(currentAddressBookQuery)) {
    queryAddressBook = unref(addressBooks).find(({ id }) => id === unref(currentAddressBookQuery))
  }

  setCurrentAddressBook(queryAddressBook || unref(addressBooks)?.[0])

  await loadContacts(unref(currentAccount).accountId, unref(currentAddressBook).id)
  isLoading.value = false
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
