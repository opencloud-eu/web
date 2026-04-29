<template>
  <no-content-message v-if="!currentContact" img-src="/images/empty-states/empty-contacts.svg">
    <template #message>
      <span v-text="$gettext('No contact selected')" />
    </template>
  </no-content-message>
  <div v-else class="contact-details pb-4 pt-4 md:px-6 md:pb-6">
    <div class="md:hidden flex h-11 items-center px-4">
      <oc-button
        class="h-10 w-10 shrink-0 p-0"
        appearance="raw"
        no-hover
        :aria-label="$gettext('Navigate back')"
        @click="onNavigateBack"
      >
        <oc-icon name="arrow-left" fill-type="line" />
      </oc-button>
    </div>
    <div class="px-4 md:px-0">
      <ContactDetailsContent :contact="currentContact" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { NoContentMessage } from '@opencloud-eu/web-pkg'
import { storeToRefs } from 'pinia'
import { useContactsStore } from '../composables/piniaStores/contacts'
import { useContactEditor } from '../composables/useContactEditor'
import ContactDetailsContent from '../components/ContactDetailsContent.vue'

const contactsStore = useContactsStore()
const { runWithDiscardConfirmation } = useContactEditor()
const { currentContact } = storeToRefs(contactsStore)
const { setCurrentContact } = contactsStore

const onNavigateBack = async () => {
  await runWithDiscardConfirmation(async () => {
    setCurrentContact(null)
  })
}
</script>
