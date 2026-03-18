<template>
  <div class="h-full overflow-y-auto">
    <app-loading-spinner v-if="isLoading" />
    <template v-else>
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
import { NoContentMessage, AppLoadingSpinner } from '@opencloud-eu/web-pkg'
import { useLoadContacts } from '../composables/useLoadContacts'
import { useContactsStore } from '../composables/piniaStores/contacts'
import { storeToRefs } from 'pinia'
import ContactsListItem from '../components/ContactsListItem.vue'
import { computed } from 'vue'
import { getContactNameParts } from '../helpers/contactName'

const { isLoading } = useLoadContacts()
const { $gettext } = useGettext()
const contactsStore = useContactsStore()
const { contacts } = storeToRefs(contactsStore)

const sortedContacts = computed(() => {
  return [...contacts.value].sort((a, b) => {
    const aNameParts = getContactNameParts(a)
    const bNameParts = getContactNameParts(b)

    const byGiven = aNameParts.givenName.localeCompare(bNameParts.givenName, undefined, {
      sensitivity: 'base'
    })

    if (byGiven !== 0) {
      return byGiven
    }

    const bySurname = aNameParts.surname.localeCompare(bNameParts.surname, undefined, {
      sensitivity: 'base'
    })

    if (bySurname !== 0) {
      return bySurname
    }

    return a.id.localeCompare(b.id, undefined, { sensitivity: 'base' })
  })
})
</script>
