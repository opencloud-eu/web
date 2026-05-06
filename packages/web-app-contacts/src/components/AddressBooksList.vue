<template>
  <div class="address-books-list px-1 flex flex-col h-full">
    <div v-if="isLoading" class="flex h-full items-center justify-center">
      <oc-spinner :aria-label="$gettext('Loading address books')" />
    </div>
    <oc-list v-else>
      <li v-for="addressBook in addressBooks" :key="addressBook.id" class="pb-1 px-2">
        <oc-button
          :class="[
            'sidebar-address-book-item',
            'relative',
            'w-full',
            'whitespace-nowrap',
            'px-2',
            'py-3',
            'select-none',
            'rounded-xl',
            { 'active overflow-hidden outline': currentAddressBook?.id === addressBook.id },
            {
              'hover:bg-role-surface-container-highest focus:bg-role-surface-container-highest':
                currentAddressBook?.id !== addressBook.id
            }
          ]"
          :appearance="currentAddressBook?.id === addressBook.id ? 'filled' : 'raw-inverse'"
          color-role="surface"
          justify-content="left"
          @click="onSelectAddressBook(addressBook)"
        >
          <div class="flex items-center justify-between w-full">
            <div class="flex items-center truncate">
              <oc-icon name="folder" class="mr-2" fill-type="line" />
              <span class="truncate font-bold" v-text="addressBook.name" />
            </div>
          </div>
        </oc-button>
      </li>
    </oc-list>
  </div>
</template>

<script setup lang="ts">
import { useAddressBooksStore } from '../composables/piniaStores/addressbooks'
import { storeToRefs } from 'pinia'
import { AddressBook } from '../types'
import { useLoadAddressBooks } from '../composables/useLoadAddressbooks'
import { useGroupwareAccountsStore } from '@opencloud-eu/web-pkg'
import { useLoadContacts } from '../composables/useLoadContacts'
import { unref } from 'vue'
import { useContactsStore } from '../composables/piniaStores/contacts'
import { useContactEditor } from '../composables/useContactEditor'

const addressBooksStore = useAddressBooksStore()
const accountsStore = useGroupwareAccountsStore()
const contactsStore = useContactsStore()
const { runWithDiscardConfirmation } = useContactEditor()
const { currentAccount } = storeToRefs(accountsStore)
const { setCurrentAddressBook } = addressBooksStore
const { addressBooks, currentAddressBook } = storeToRefs(addressBooksStore)
const { setCurrentContact } = contactsStore

const { isLoading } = useLoadAddressBooks()
const { loadContacts } = useLoadContacts()

const onSelectAddressBook = async (addressBook: AddressBook) => {
  await runWithDiscardConfirmation(async () => {
    setCurrentAddressBook(addressBook)
    setCurrentContact(null)
    await loadContacts(unref(currentAccount).accountId, addressBook.id)
  })
}
</script>

<style scoped>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .sidebar-address-book-item:is(.active) {
    outline-color: var(--oc-role-surface-container-highest);
  }
  .sidebar-address-book-item:not(.active) {
    color: var(--oc-role-on-surface-variant);
  }
}
</style>
