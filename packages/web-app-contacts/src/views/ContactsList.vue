<template>
  <app-loading-spinner v-if="isLoading" />
  <no-content-message
    v-else-if="error"
    id="contacts-error"
    role="alert"
    class="px-4 py-8"
    icon="error-warning"
    icon-fill-type="line"
  >
    <template #message>
      <span v-text="$gettext('Contacts could not be loaded')" />
    </template>
    <template #callToAction>
      <oc-button class="mt-4" appearance="outline" @click="onRetry">
        <span v-text="$gettext('Retry')" />
      </oc-button>
    </template>
  </no-content-message>
  <template v-else>
    <div class="md:hidden flex h-11 items-center px-4">
      <div class="min-w-0 flex-1">
        <h2
          class="truncate text-center text-lg font-bold leading-none"
          v-text="currentAddressBook.name"
        />
      </div>
    </div>
    <div v-if="sortedContacts.length || normalizedSearchTerm" class="px-4 pb-3 pt-2">
      <oc-search-bar
        v-model="searchTerm"
        :label="$gettext('Search contacts')"
        :placeholder="$gettext('Search contacts')"
        :button-hidden="true"
        is-filter
      />
    </div>
    <no-content-message
      v-if="!sortedContacts.length && !normalizedSearchTerm"
      id="contacts-empty"
      img-src="images/illustrations/contacts.svg"
    >
      <template #message>
        <span v-text="$gettext('No contacts available yet.')" />
      </template>
    </no-content-message>
    <no-content-message
      v-else-if="!filteredContacts.length"
      id="contacts-search-empty"
      img-src="images/illustrations/contacts.svg"
    >
      <template #message>
        <span v-text="$gettext('No contacts found.')" />
      </template>
    </no-content-message>
    <div v-else>
      <oc-list>
        <li
          v-for="contact in filteredContacts"
          :id="`contact-list-item-${contact.id}`"
          :key="contact.id"
          class="border-b-2 last:border-b-0"
          :class="{ 'bg-role-secondary-container': currentContact?.id === contact.id }"
        >
          <div class="flex min-w-0 items-stretch">
            <oc-button
              class="min-w-0 flex-1 px-4 py-4 text-left"
              justify-content="left"
              appearance="raw"
              gap-size="none"
              no-hover
              @click="onSelectContact(contact)"
            >
              <ContactsListItem
                :contact="contact"
                :term="normalizedSearchTerm"
                :address-book-name="getOtherAddressBookName(contact)"
              />
            </oc-button>

            <div class="flex items-center pr-2">
              <oc-button
                :id="`contact-actions-toggle-${contact.id}`"
                class="h-10 w-10 shrink-0"
                appearance="raw"
                no-hover
                :aria-label="$gettext('Open contact actions')"
                @click.stop
              >
                <oc-icon name="more-2" fill-type="line" />
              </oc-button>
              <oc-drop
                :drop-id="`contact-actions-drop-${contact.id}`"
                :toggle="`#contact-actions-toggle-${contact.id}`"
                :title="$gettext('Contact actions')"
                position="bottom-end"
                padding-size="small"
                teleport="#app-runtime-drop"
                close-on-click
              >
                <ContextActionMenu
                  :menu-sections="getContactMenuSections(contact)"
                  :action-options="{ resources: [contact] }"
                />
              </oc-drop>
            </div>
          </div>
        </li>
      </oc-list>
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed, ref, unref, watch, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useGettext } from 'vue3-gettext'
import {
  AppLoadingSpinner,
  ContextActionMenu,
  NoContentMessage,
  MenuSection
} from '@opencloud-eu/web-pkg'
import { Contact } from '../types'
import { useLoadContacts } from '../composables/useLoadContacts'
import { useLoadAllContacts } from '../composables/useLoadAllContacts'
import { useContactsStore } from '../composables/piniaStores/contacts'
import { useAddressBooksStore } from '../composables/piniaStores/addressbooks'
import { useContactEditor } from '../composables/useContactEditor'
import { useContactSearch } from '../composables/useContactSearch'
import { useContactActionsDelete } from '../composables/actions/useContactActionsDelete'
import { useContactActionsEdit } from '../composables/actions/useContactActionsEdit'
import { getContactDisplayName } from '../helpers'
import ContactsListItem from '../components/ContactsListItem.vue'
import { useGroupwareAccountsStore } from '@opencloud-eu/web-pkg'

const { isLoading, error, reloadContacts, loadContacts } = useLoadContacts()
const { allContacts, loadedAccountId, loadAllContacts } = useLoadAllContacts()
const accountsStore = useGroupwareAccountsStore()
const { $gettext } = useGettext()
const contactsStore = useContactsStore()
const addressBooksStore = useAddressBooksStore()
const { runWithDiscardConfirmation } = useContactEditor()
const { actions: deleteActions } = useContactActionsDelete()
const { actions: editActions } = useContactActionsEdit()
const { contacts, currentContact } = storeToRefs(contactsStore)
const { currentAddressBook, addressBooks } = storeToRefs(addressBooksStore)
const { setCurrentContact } = contactsStore
const { setCurrentAddressBook } = addressBooksStore

const sortByName = (values: Contact[]) => {
  return [...values].sort((a, b) => {
    const aSortName = getContactDisplayName(a)
    const bSortName = getContactDisplayName(b)

    return aSortName.localeCompare(bSortName, undefined, { sensitivity: 'base' })
  })
}

const sortedContacts = computed(() => sortByName(unref(contacts)))

const isInCurrentAddressBook = (contact: Contact) => {
  return unref(contacts).some(({ id }) => id === contact.id)
}

// while searching, the contacts of all address books are searched
const isSearchingAllAddressBooks = ref(false)
const searchedContacts = computed(() => {
  const accountId = unref(accountsStore.currentAccount)?.accountId
  if (!unref(isSearchingAllAddressBooks) || unref(loadedAccountId) !== accountId) {
    return unref(sortedContacts)
  }

  // the loaded contacts of the current address book are up to date, e.g. after editing one
  const currentAddressBookId = unref(currentAddressBook)?.id
  const otherContacts = unref(allContacts).filter(
    ({ addressBookIds }) => !addressBookIds?.[currentAddressBookId]
  )
  return sortByName([...unref(contacts), ...otherContacts])
})

const { searchTerm, normalizedSearchTerm, filteredContacts } = useContactSearch(searchedContacts)

watch(normalizedSearchTerm, (term, previousTerm) => {
  isSearchingAllAddressBooks.value = !!term
  const accountId = unref(accountsStore.currentAccount)?.accountId
  // reload when a new search starts to include changes made in the meantime
  if (term && !previousTerm && accountId) {
    loadAllContacts(accountId)
  }
})

const getContactAddressBook = (contact: Contact) => {
  return unref(addressBooks).find(({ id }) => contact.addressBookIds?.[id])
}

const getOtherAddressBookName = (contact: Contact) => {
  if (isInCurrentAddressBook(contact)) {
    return undefined
  }
  return getContactAddressBook(contact)?.name
}

const onRetry = async () => {
  try {
    await reloadContacts()
  } catch {
    // the error state is shown again
  }
}

const onSelectContact = (contact: Contact) => {
  runWithDiscardConfirmation(async () => {
    const addressBook = getContactAddressBook(contact)
    if (isInCurrentAddressBook(contact) || !addressBook) {
      setCurrentContact(contact)
      return
    }

    // search results of other address books open in their address book
    setCurrentAddressBook(addressBook)
    try {
      await loadContacts(unref(accountsStore.currentAccount).accountId, addressBook.id)
      setCurrentContact(unref(contacts).find(({ id }) => id === contact.id))
    } catch {
      // the error state is shown in the contacts list
    }
  })
}

const getContactMenuSections = (contact: Contact): MenuSection[] => {
  const sections: MenuSection[] = [
    {
      name: 'default',
      items: [
        {
          name: 'details',
          icon: 'information',
          label: () => $gettext('Details'),
          isVisible: () => true,
          handler: () => {
            void onSelectContact(contact)
          }
        },
        // contacts of other address books can be changed after opening them
        ...(isInCurrentAddressBook(contact) ? unref(editActions) : [])
      ]
    },
    {
      name: 'secondary',
      items: isInCurrentAddressBook(contact) ? unref(deleteActions) : []
    }
  ]

  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.isVisible({ resources: [contact] }))
    }))
    .filter((section) => section.items.length)
}

watch(
  [() => currentContact.value?.id, isLoading],
  async () => {
    if (isLoading.value || !currentContact.value) {
      return
    }

    await nextTick()
    document
      .getElementById(`contact-list-item-${currentContact.value.id}`)
      ?.scrollIntoView({ block: 'nearest' })
  },
  { immediate: true }
)
</script>
