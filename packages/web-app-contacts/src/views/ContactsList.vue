<template>
  <div class="h-full overflow-y-auto">
    <div v-if="isLoading" class="flex h-full justify-center items-center">
      <oc-spinner :aria-label="$gettext('Loading contacts')" />
    </div>
    <template v-else>
      <no-content-message
        v-if="!contacts.length"
        id="contacts-empty"
        img-src="/images/empty-states/empty-contacts.svg"
      >
        <template #message>
          <span v-text="$gettext('No contacts available yet.')" />
        </template>
      </no-content-message>
      <oc-list v-else>
        <li
          v-for="contact in contacts"
          :key="contact.id"
          class="border-b border-role-surface-container-highest last:border-b-0"
        >
          <contacts-list-item :contact="contact" />
        </li>
      </oc-list>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useGettext } from 'vue3-gettext'
import { NoContentMessage } from '@opencloud-eu/web-pkg'
import { useLoadContacts } from '../composables/useLoadContacts'
import { useContactsStore } from '../composables/piniaStores/contacts'
import { storeToRefs } from 'pinia'
import ContactsListItem from '../components/ContactsListItem.vue'

const { isLoading } = useLoadContacts()
const { $gettext } = useGettext()
const contactsStore = useContactsStore()
const { contacts } = storeToRefs(contactsStore)
</script>
