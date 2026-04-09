<template>
  <div class="h-full">
    <div v-if="isLoading" class="flex h-full items-center justify-center">
      <app-loading-spinner />
    </div>
    <template v-else>
      <div class="flex h-full">
        <div
          class="min-w-0 w-full overflow-y-auto md:w-[22rem] md:shrink-0 md:border-r-2 md:border-role-outline-variant"
          :class="{ 'hidden md:block': currentContact }"
        >
          <ContactsList />
        </div>
        <div
          class="min-w-0 w-full overflow-y-auto bg-role-surface md:flex-1"
          :class="{ 'hidden md:block': !currentContact }"
        >
          <ContactDetails :key="currentContact?.id" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  queryItemAsString,
  useClientService,
  useGroupwareAccountsStore,
  useRouteQuery,
  AppLoadingSpinner
} from '@opencloud-eu/web-pkg'
import { storeToRefs } from 'pinia'
import { onMounted, ref, unref } from 'vue'
import { useAddressBooksStore } from '../composables/piniaStores/addressbooks'
import { useLoadAddressBooks } from '../composables/useLoadAddressbooks'
import { AddressBook, Contact } from '../types'
import { useLoadContacts } from '../composables/useLoadContacts'
import ContactsList from './ContactsList.vue'
import ContactDetails from './ContactDetails.vue'
import { useContactsStore } from '../composables/piniaStores/contacts'

const accountsStore = useGroupwareAccountsStore()
const addressBooksStore = useAddressBooksStore()
const contactsStore = useContactsStore()
const { loadCurrentAccount } = accountsStore
const { setCurrentAddressBook } = addressBooksStore
const { setCurrentContact } = contactsStore
const { currentAccount } = storeToRefs(accountsStore)
const { addressBooks, currentAddressBook } = storeToRefs(addressBooksStore)
const { contacts, currentContact } = storeToRefs(contactsStore)
const { loadAddressBooks } = useLoadAddressBooks()
const { loadContacts } = useLoadContacts()
const { httpAuthenticated } = useClientService()

const isLoading = ref<boolean>(true)

const currentAccountIdQuery = useRouteQuery('accountId')
const currentAddressBookQuery = useRouteQuery('addressBookId')
const currentContactQuery = useRouteQuery('contactId')

const loadAddressBooksAndContacts = async () => {
  isLoading.value = true
  await loadAddressBooks(unref(currentAccount).accountId)

  let queryAddressBook: AddressBook | undefined
  if (unref(currentAddressBookQuery)) {
    queryAddressBook = unref(addressBooks).find(({ id }) => id === unref(currentAddressBookQuery))
  }

  setCurrentAddressBook(queryAddressBook || unref(addressBooks)?.[0])

  await loadContacts(unref(currentAccount).accountId, unref(currentAddressBook).id)

  let queryContact: Contact | undefined
  if (unref(currentContactQuery)) {
    queryContact = unref(contacts).find(({ id }) => id === unref(currentContactQuery))
  }

  setCurrentContact(queryContact || null)

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
