<template>
  <app-loading-spinner v-if="isLoading" />
  <template v-else>
    <div class="md:hidden flex h-11 items-center px-4">
      <div class="min-w-0 flex-1">
        <h2
          class="truncate text-center text-lg font-bold leading-none"
          v-text="currentAddressBook.name"
        />
      </div>
    </div>
    <div v-if="sortedContacts.length" class="px-4 pb-3 pt-2">
      <oc-search-bar
        v-model="searchTerm"
        :label="$gettext('Search contacts')"
        :placeholder="$gettext('Search contacts')"
        :button-hidden="true"
        is-filter
      />
    </div>
    <no-content-message
      v-if="!sortedContacts.length"
      id="contacts-empty"
      img-src="/images/empty-states/empty-contacts.svg"
    >
      <template #message>
        <span v-text="$gettext('No contacts available yet.')" />
      </template>
    </no-content-message>
    <no-content-message
      v-else-if="!filteredContacts.length"
      id="contacts-search-empty"
      img-src="/images/empty-states/empty-contacts.svg"
    >
      <template #message>
        <span v-text="$gettext('No contacts found.')" />
      </template>
    </no-content-message>
    <div v-else ref="contactsListRef">
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
              <ContactsListItem :contact="contact" />
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
                  :action-options="actionOptions"
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
import { computed, watch, nextTick, unref, useTemplateRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useGettext } from 'vue3-gettext'
import Mark from 'mark.js'
import {
  AppLoadingSpinner,
  ContextActionMenu,
  NoContentMessage,
  MenuSection,
  ActionOptions
} from '@opencloud-eu/web-pkg'
import { Contact } from '../types'
import { useLoadContacts } from '../composables/useLoadContacts'
import { useContactsStore } from '../composables/piniaStores/contacts'
import { useAddressBooksStore } from '../composables/piniaStores/addressbooks'
import { useContactEditor } from '../composables/useContactEditor'
import { useContactSearch } from '../composables/useContactSearch'
import { getContactDisplayName } from '../helpers'
import ContactsListItem from '../components/ContactsListItem.vue'

const { isLoading } = useLoadContacts()
const { $gettext } = useGettext()
const contactsStore = useContactsStore()
const addressBooksStore = useAddressBooksStore()
const { runWithDiscardConfirmation } = useContactEditor()
const { contacts, currentContact } = storeToRefs(contactsStore)
const { currentAddressBook } = storeToRefs(addressBooksStore)
const { setCurrentContact } = contactsStore

const actionOptions = {} as ActionOptions
const contactsListRef = useTemplateRef('contactsListRef')

const sortedContacts = computed(() => {
  return [...contacts.value].sort((a, b) => {
    const aSortName = getContactDisplayName(a)
    const bSortName = getContactDisplayName(b)

    return aSortName.localeCompare(bSortName, undefined, { sensitivity: 'base' })
  })
})

const { searchTerm, filteredContacts } = useContactSearch(sortedContacts)

const onSelectContact = async (contact: Contact) => {
  await runWithDiscardConfirmation(async () => {
    setCurrentContact(contact)
  })
}

const getContactMenuSections = (contact: Contact): MenuSection[] => {
  return [
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
        }
      ]
    }
  ]
}

let markInstance: Mark | undefined
watch(searchTerm, () => {
  if (unref(contactsListRef)) {
    markInstance = new Mark(unref(contactsListRef))
    markInstance.unmark()
    markInstance.mark(unref(searchTerm), {
      element: 'span',
      className: 'mark-highlight'
    })
  }
})

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

<style scoped>
:deep(.mark-highlight) {
  background-color: #fef3c7;
}
</style>
