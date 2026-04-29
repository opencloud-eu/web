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

      <ContactCreateEditor
        v-if="isCreateOpen"
        :key="unref(isDesktop) ? 'modal' : 'drawer'"
        :variant="unref(isDesktop) ? 'modal' : 'drawer'"
      />
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
import { computed, onMounted, onUnmounted, ref, unref } from 'vue'
import { useAddressBooksStore } from '../composables/piniaStores/addressbooks'
import { useLoadAddressBooks } from '../composables/useLoadAddressbooks'
import type { AddressBook, Contact } from '../types'
import { useLoadContacts } from '../composables/useLoadContacts'
import ContactsList from './ContactsList.vue'
import ContactDetails from './ContactDetails.vue'
import ContactCreateEditor from '../components/ContactCreateEditor.vue'
import { useContactsStore } from '../composables/piniaStores/contacts'
import { useContactEditor } from '../composables/useContactEditor'

const DESKTOP_MEDIA_QUERY = '(min-width: 768px)'

const accountsStore = useGroupwareAccountsStore()
const addressBooksStore = useAddressBooksStore()
const contactsStore = useContactsStore()
const contactEditor = useContactEditor()

const { loadCurrentAccount } = accountsStore
const { setCurrentAddressBook } = addressBooksStore
const { setCurrentContact } = contactsStore
const { loadAddressBooks } = useLoadAddressBooks()
const { loadContacts } = useLoadContacts()
const { httpAuthenticated } = useClientService()

const currentAccount = computed<{ accountId: string } | undefined>(() => {
  return unref(accountsStore.currentAccount) as { accountId: string } | undefined
})

const addressBooks = computed<AddressBook[]>(() => {
  return unref(addressBooksStore.addressBooks) as AddressBook[]
})

const currentAddressBook = computed<AddressBook | undefined>(() => {
  return unref(addressBooksStore.currentAddressBook) as AddressBook | undefined
})

const contacts = computed<Contact[]>(() => {
  return unref(contactsStore.contacts) as Contact[]
})

const currentContact = computed<Contact | undefined>(() => {
  return unref(contactsStore.currentContact) as Contact | undefined
})

const isCreateOpen = computed(() => {
  return unref(contactEditor.isCreateOpen)
})

const isLoading = ref<boolean>(true)
const isDesktop = ref(false)
const mediaQueryList = ref<MediaQueryList>()

const currentAccountIdQuery = useRouteQuery('accountId')
const currentAddressBookQuery = useRouteQuery('addressBookId')
const currentContactQuery = useRouteQuery('contactId')

const accountQueryId = computed(() => {
  return queryItemAsString(unref(currentAccountIdQuery))
})

const addressBookQueryId = computed(() => {
  return queryItemAsString(unref(currentAddressBookQuery))
})

const contactQueryId = computed(() => {
  return queryItemAsString(unref(currentContactQuery))
})

const updateIsDesktop = () => {
  isDesktop.value = !!unref(mediaQueryList)?.matches
}

const setupDesktopDetection = () => {
  if (typeof window === 'undefined') {
    return
  }

  mediaQueryList.value = window.matchMedia(DESKTOP_MEDIA_QUERY)
  updateIsDesktop()
  unref(mediaQueryList)?.addEventListener('change', updateIsDesktop)
}

const cleanupDesktopDetection = () => {
  unref(mediaQueryList)?.removeEventListener('change', updateIsDesktop)
}

const loadAddressBooksAndContacts = async () => {
  isLoading.value = true

  try {
    if (!unref(currentAccount)?.accountId) {
      setCurrentContact(null)
      return
    }

    await loadAddressBooks(unref(currentAccount).accountId)

    let queryAddressBook: AddressBook | undefined
    if (unref(addressBookQueryId)) {
      queryAddressBook = unref(addressBooks).find(({ id }) => id === unref(addressBookQueryId))
    }

    setCurrentAddressBook(queryAddressBook || unref(addressBooks)?.[0])

    if (!unref(currentAddressBook)?.id) {
      setCurrentContact(null)
      return
    }

    await loadContacts(unref(currentAccount).accountId, unref(currentAddressBook).id)

    let queryContact: Contact | undefined
    if (unref(contactQueryId)) {
      queryContact = unref(contacts).find(({ id }) => id === unref(contactQueryId))
    }

    setCurrentContact(queryContact || null)
  } catch (error) {
    console.error('Failed to load contacts view:', error)
  } finally {
    isLoading.value = false
  }
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
  setupDesktopDetection()

  loadCurrentAccount({
    client: httpAuthenticated,
    query: unref(accountQueryId) || undefined
  })
})

onUnmounted(() => {
  cleanupDesktopDetection()
})
</script>
