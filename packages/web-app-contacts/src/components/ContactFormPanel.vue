<template>
  <div
    v-if="variant === 'drawer'"
    class="fixed inset-0 z-[var(--z-index-modal)] bg-black/20 md:hidden"
    @click.self="requestClose"
  >
    <div
      class="absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col rounded-t-2xl bg-role-surface-container-high shadow-xl"
    >
      <div class="flex items-center justify-between px-4 pt-4">
        <span class="font-semibold" v-text="title" />
        <div class="flex items-center gap-3">
          <oc-button
            appearance="raw"
            class="raw-hover-surface"
            :aria-label="$gettext('Close')"
            @click="requestClose"
          >
            <oc-icon name="close" fill-type="line" />
          </oc-button>
        </div>
      </div>
      <div class="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-4">
        <div class="flex min-h-0 flex-col rounded-xl bg-role-surface">
          <div class="min-h-0 overflow-auto px-4 py-4 pb-6">
            <ContactForm :model-value="unref(formState)" @update:model-value="onUpdateForm" />
          </div>

          <div class="px-4 pt-3 pb-3">
            <div class="flex items-center justify-end gap-3">
              <oc-button
                appearance="filled"
                class="min-w-[120px]"
                :disabled="unref(isSubmitDisabled)"
                @click="onSubmit"
              >
                <span v-text="$gettext('Save')" />
              </oc-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <oc-modal
    v-else
    element-class="contact-create-modal"
    :title="title"
    :hide-actions="true"
    hide-cancel-button
  >
    <template #headerActions>
      <oc-button appearance="raw" :aria-label="$gettext('Close')" @click="requestClose">
        <oc-icon name="close" fill-type="line" />
      </oc-button>
    </template>

    <template #content>
      <div class="flex min-h-0 flex-1 flex-col">
        <div class="flex-1 min-h-0 overflow-auto pb-6 pr-4">
          <ContactForm :model-value="unref(formState)" @update:model-value="onUpdateForm" />
        </div>
        <div class="flex items-center justify-end gap-3">
          <oc-button
            appearance="filled"
            class="min-w-[120px]"
            :disabled="unref(isSubmitDisabled)"
            @click="onSubmit"
          >
            <span v-text="$gettext('Save')" />
          </oc-button>
        </div>
      </div>
    </template>
  </oc-modal>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { useGroupwareAccountsStore, useMessages } from '@opencloud-eu/web-pkg'
import { useAddressBooksStore } from '../composables/piniaStores/addressbooks'
import { useContactsStore } from '../composables/piniaStores/contacts'
import { useContactEditor } from '../composables/useContactEditor'
import { useCreateContact } from '../composables/useCreateContact'
import { useUpdateContact } from '../composables/useUpdateContact'
import ContactForm from './ContactForm.vue'
import {
  createContactPayload,
  createContactUpdatePayload,
  getNotRemovedProperties,
  type ContactFormState,
  hasInvalidContactEmail
} from '../helpers/contactForm'
import type { Contact } from '../types'

defineProps<{
  variant: 'modal' | 'drawer'
}>()

const { $gettext } = useGettext()
const { showMessage, showErrorMessage } = useMessages()

const accountsStore = useGroupwareAccountsStore()
const addressBooksStore = useAddressBooksStore()
const contactsStore = useContactsStore()
const contactEditor = useContactEditor()
const { createContact, isSaving: isCreating } = useCreateContact()
const { updateContact, isSaving: isUpdating } = useUpdateContact()

const currentAccount = computed(() => unref(accountsStore.currentAccount))
const currentAddressBook = computed(() => unref(addressBooksStore.currentAddressBook))

const formState = computed(() => unref(contactEditor.formState))
const hasChanges = computed(() => unref(contactEditor.hasChanges))
const editedContact = computed(() => unref(contactEditor.editedContact))

const { closeEditor, closeEditorIfSafe, setFormState, markDirty } = contactEditor

const title = computed(() => {
  return unref(editedContact) ? $gettext('Edit contact') : $gettext('New contact')
})

const { upsertContact, setCurrentContact } = contactsStore

const isSubmitDisabled = computed(() => {
  return (
    !unref(hasChanges) ||
    !unref(currentAccount)?.accountId ||
    !unref(currentAddressBook)?.id ||
    hasInvalidContactEmail(unref(formState)) ||
    unref(isCreating) ||
    unref(isUpdating)
  )
})

const onUpdateForm = (value: ContactFormState) => {
  setFormState(value)
  markDirty()
}

const requestClose = async () => {
  await closeEditorIfSafe()
}

const showSaveError = (error: unknown) => {
  showErrorMessage({
    ...(unref(editedContact)
      ? {
          title: $gettext('Failed to save contact'),
          desc: $gettext('The contact could not be saved. Please try again.')
        }
      : {
          title: $gettext('Failed to create contact'),
          desc: $gettext('The contact could not be created. Please try again.')
        }),
    ...(error instanceof Error ? { errors: [error] } : {})
  })
}

const saveContact = async (accountId: string, addressBookId: string): Promise<Contact> => {
  const contact = unref(editedContact)
  if (!contact) {
    return createContact(accountId, createContactPayload(unref(formState), addressBookId))
  }

  const payload = createContactUpdatePayload(
    unref(formState),
    unref(contactEditor.initialFormState),
    contact
  )
  const savedContact = await updateContact(accountId, contact.id, payload)
  if (getNotRemovedProperties(payload, savedContact).length) {
    showMessage({
      title: $gettext('Some removed information is still saved'),
      desc: $gettext(
        'The contact was saved, but removing information completely is not supported yet. The removed values are still part of the contact.'
      ),
      status: 'warning'
    })
  }
  return savedContact
}

const onSubmit = async () => {
  const accountId = unref(currentAccount)?.accountId
  const addressBookId = unref(currentAddressBook)?.id

  if (!accountId || !addressBookId || !unref(hasChanges)) {
    return
  }

  try {
    const savedContact = await saveContact(accountId, addressBookId)

    upsertContact(savedContact)
    setCurrentContact(savedContact)
    closeEditor()
  } catch (error) {
    console.error('Failed to save contact:', error)
    showSaveError(error)
  }
}
</script>

<style>
.contact-create-modal {
  width: min(90vw, 44rem);
  max-width: 44rem;
  display: flex;
  flex-direction: column;
}

.contact-create-modal .oc-modal-body,
.contact-create-modal .oc-modal-body-message {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
