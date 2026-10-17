<template>
  <no-content-message v-if="!currentContact" img-src="images/illustrations/contacts.svg">
    <template #message>
      <span v-text="$gettext('No contact selected')" />
    </template>
  </no-content-message>
  <div v-else class="contact-details pb-4 pt-4 md:px-6 md:pb-6">
    <div class="flex h-11 items-center px-4 md:px-0">
      <oc-button
        class="h-10 w-10 shrink-0 p-0 md:hidden"
        appearance="raw"
        no-hover
        :aria-label="$gettext('Navigate back')"
        @click="onNavigateBack"
      >
        <oc-icon name="arrow-left" fill-type="line" />
      </oc-button>
      <div
        v-if="!canWriteCurrentAddressBook"
        class="contact-details-read-only ml-auto flex items-center gap-1 text-sm text-role-on-surface-variant"
      >
        <oc-icon name="lock" fill-type="line" size="small" />
        <span v-text="$gettext('Read-only')" />
      </div>
      <oc-button
        v-if="canWriteCurrentAddressBook"
        class="contact-details-edit ml-auto h-10 w-10 shrink-0 p-0"
        appearance="raw"
        :aria-label="$gettext('Edit contact')"
        @click="onEdit"
      >
        <oc-icon name="pencil" fill-type="line" />
      </oc-button>
      <oc-button
        v-if="canWriteCurrentAddressBook"
        class="contact-details-delete h-10 w-10 shrink-0 p-0"
        appearance="raw"
        :aria-label="$gettext('Delete contact')"
        @click="onDelete"
      >
        <oc-icon name="delete-bin" fill-type="line" />
      </oc-button>
    </div>
    <div class="px-4 md:px-0">
      <ContactDetailsContent :contact="currentContact" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { NoContentMessage } from '@opencloud-eu/web-pkg'
import { unref } from 'vue'
import { storeToRefs } from 'pinia'
import { useContactsStore } from '../composables/piniaStores/contacts'
import { useAddressBooksStore } from '../composables/piniaStores/addressbooks'
import { useContactEditor } from '../composables/useContactEditor'
import { useContactActionsDelete } from '../composables/actions/useContactActionsDelete'
import { useContactActionsEdit } from '../composables/actions/useContactActionsEdit'
import ContactDetailsContent from '../components/ContactDetailsContent.vue'

const contactsStore = useContactsStore()
const { runWithDiscardConfirmation } = useContactEditor()
const { getDeleteAction } = useContactActionsDelete()
const { getEditAction } = useContactActionsEdit()
const { currentContact } = storeToRefs(contactsStore)
const { canWriteCurrentAddressBook } = storeToRefs(useAddressBooksStore())
const { setCurrentContact } = contactsStore

const onNavigateBack = () => {
  runWithDiscardConfirmation(() => {
    setCurrentContact(null)
  })
}

const onEdit = () => {
  getEditAction(unref(currentContact)).handler()
}

const onDelete = () => {
  getDeleteAction(unref(currentContact)).handler()
}
</script>
