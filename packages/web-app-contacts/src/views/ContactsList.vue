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
      id="contacts-empty"
      img-src="/images/empty-states/empty-contacts.svg"
    >
      <template #message>
        <span v-text="$gettext('No contacts found.')" />
      </template>
    </no-content-message>
    <oc-list v-else>
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
            <div class="min-w-0 flex-1">
              <ContactsListItem :contact="contact" />
              <div
                v-if="normalizedSearchTerm"
                class="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-sm text-role-on-surface-variant"
              >
                <span
                  v-for="(value, valueIndex) in getMatchingContactValues(contact)"
                  :key="`${contact.id}-search-match-${valueIndex}`"
                  class="min-w-0 break-all"
                >
                  <template
                    v-for="(part, partIndex) in getHighlightedTextParts(value)"
                    :key="`${contact.id}-search-match-${valueIndex}-${partIndex}`"
                  >
                    <span
                      v-if="part.highlight"
                      class="rounded bg-role-secondary-container text-sm bg-yellow-200"
                    >
                      {{ part.text }}
                    </span>
                    <span v-else>{{ part.text }}</span>
                  </template>
                </span>
              </div>
            </div>
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
                :action-options="{}"
              />
            </oc-drop>
          </div>
        </div>
      </li>
    </oc-list>
  </template>
</template>

<script setup lang="ts">
import { computed, watch, nextTick } from 'vue'
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

const sortedContacts = computed(() => {
  return [...contacts.value].sort((a, b) => {
    const aSortName = getContactDisplayName(a)
    const bSortName = getContactDisplayName(b)

    return aSortName.localeCompare(bSortName, undefined, { sensitivity: 'base' })
  })
})

const {
  searchTerm,
  normalizedSearchTerm,
  filteredContacts,
  getMatchingContactValues,
  getHighlightedTextParts
} = useContactSearch(sortedContacts)

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
