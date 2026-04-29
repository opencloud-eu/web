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
    <no-content-message
      v-if="!sortedContacts.length"
      id="contacts-empty"
      img-src="/images/empty-states/empty-contacts.svg"
    >
      <template #message>
        <span v-text="$gettext('No contacts available yet.')" />
      </template>
    </no-content-message>
    <oc-list v-else>
      <li
        v-for="contact in sortedContacts"
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
              :id="getContactActionsToggleId(contact.id)"
              class="h-10 w-10 shrink-0"
              appearance="raw"
              no-hover
              :aria-label="$gettext('Open contact actions')"
              @click.stop
            >
              <oc-icon name="more-2" fill-type="line" />
            </oc-button>
            <oc-drop
              :drop-id="getContactActionsDropId(contact.id)"
              :toggle="`#${getContactActionsToggleId(contact.id)}`"
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
  </template>
</template>

<script setup lang="ts">
import { computed, watch, nextTick, unref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGettext } from 'vue3-gettext'
import {
  AppLoadingSpinner,
  ContextActionMenu,
  NoContentMessage,
  ActionOptions,
  MenuSection
} from '@opencloud-eu/web-pkg'
import { Contact } from '../types'
import { useLoadContacts } from '../composables/useLoadContacts'
import { useContactsStore } from '../composables/piniaStores/contacts'
import { useAddressBooksStore } from '../composables/piniaStores/addressbooks'
import { useContactEditor } from '../composables/useContactEditor'
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

const sortedContacts = computed(() => {
  return [...unref(contacts)].sort((a, b) => {
    const aSortName = getContactDisplayName(a)
    const bSortName = getContactDisplayName(b)

    return aSortName.localeCompare(bSortName, undefined, { sensitivity: 'base' })
  })
})

const onSelectContact = async (contact: Contact) => {
  await runWithDiscardConfirmation(async () => {
    setCurrentContact(contact)
  })
}

const getContactActionsToggleId = (contactId: string) => {
  return `contact-actions-toggle-${contactId}`
}

const getContactActionsDropId = (contactId: string) => {
  return `contact-actions-drop-${contactId}`
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
  [() => unref(currentContact)?.id, isLoading],
  async () => {
    if (unref(isLoading) || !unref(currentContact)) {
      return
    }

    await nextTick()
    document
      .getElementById(`contact-list-item-${unref(currentContact).id}`)
      ?.scrollIntoView({ block: 'nearest' })
  },
  { immediate: true }
)
</script>
