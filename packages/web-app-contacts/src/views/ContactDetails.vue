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
      <div class="ml-auto flex items-center">
        <oc-button
          v-if="editAction"
          v-oc-tooltip="$gettext('Edit contact')"
          class="contact-details-edit h-10 w-10 shrink-0 p-0"
          appearance="raw"
          :aria-label="$gettext('Edit contact')"
          @click="onEdit"
        >
          <oc-icon name="pencil" fill-type="line" />
        </oc-button>
        <oc-button
          v-if="deleteAction"
          v-oc-tooltip="$gettext('Delete contact')"
          class="contact-details-delete h-10 w-10 shrink-0 p-0"
          appearance="raw"
          :aria-label="$gettext('Delete contact')"
          @click="onDelete"
        >
          <oc-icon name="delete-bin" fill-type="line" />
        </oc-button>
      </div>
    </div>
    <div class="px-4 md:px-0">
      <ContactDetailsContent :contact="currentContact" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { NoContentMessage } from '@opencloud-eu/web-pkg'
import { computed, unref } from 'vue'
import { storeToRefs } from 'pinia'
import { useContactsStore } from '../composables/piniaStores/contacts'
import { useContactEditor } from '../composables/useContactEditor'
import { useContactActionsDelete } from '../composables/actions/useContactActionsDelete'
import { useContactActionsEdit } from '../composables/actions/useContactActionsEdit'
import type { ContactAction, ContactActionOptions } from '../composables/actions/types'
import ContactDetailsContent from '../components/ContactDetailsContent.vue'

const contactsStore = useContactsStore()
const { runWithDiscardConfirmation } = useContactEditor()
const { actions: deleteActions } = useContactActionsDelete()
const { actions: editActions } = useContactActionsEdit()
const { currentContact } = storeToRefs(contactsStore)
const { setCurrentContact } = contactsStore

const actionOptions = computed<ContactActionOptions>(() => ({
  resources: unref(currentContact) ? [unref(currentContact)] : []
}))

function getVisibleAction(actions: ContactAction[], name: string) {
  return actions.find((action) => action.name === name && action.isVisible(unref(actionOptions)))
}

const editAction = computed(() => getVisibleAction(unref(editActions), 'edit'))
const deleteAction = computed(() => getVisibleAction(unref(deleteActions), 'delete'))

function onNavigateBack() {
  runWithDiscardConfirmation(() => {
    setCurrentContact(null)
  })
}

function onEdit() {
  unref(editAction)?.handler(unref(actionOptions))
}

function onDelete() {
  unref(deleteAction)?.handler(unref(actionOptions))
}
</script>
