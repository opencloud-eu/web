<template>
  <div
    v-if="variant === 'drawer'"
    class="fixed inset-0 z-[var(--z-index-modal)] bg-black/20 md:hidden"
    @click.self="requestClose"
  >
    <div
      class="absolute inset-x-0 bottom-0 flex max-h-[90vh] min-h-[50vh] flex-col rounded-t-2xl bg-role-surface shadow-xl"
    >
      <div class="flex justify-center px-4 pt-3">
        <div class="h-1.5 w-12 rounded-full bg-role-outline-variant" />
      </div>

      <div class="flex items-center justify-between border-b border-role-outline-variant px-4 py-3">
        <h2 class="text-lg font-bold" v-text="$gettext('New contact')" />
        <oc-button appearance="raw" :aria-label="$gettext('Close')" @click="requestClose">
          <oc-icon name="close" fill-type="line" />
        </oc-button>
      </div>

      <div class="flex-1 min-h-0 overflow-auto px-4 py-4 pb-6">
        <ContactCreateForm
          :model-value="unref(createFormState)"
          @update:model-value="onUpdateForm"
        />
      </div>

      <div class="border-t border-role-outline-variant">
        <div class="px-4 pt-3 pb-3">
          <div class="flex items-center justify-start gap-3">
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

  <oc-modal
    v-else
    element-class="contact-create-modal"
    :title="$gettext('New contact')"
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
        <div class="flex-1 min-h-0 overflow-auto pb-6">
          <ContactCreateForm
            :model-value="unref(createFormState)"
            @update:model-value="onUpdateForm"
          />
        </div>

        <div class="border-t border-role-outline-variant">
          <div class="pt-3 pb-3">
            <div class="flex items-center justify-start gap-3">
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
    </template>
  </oc-modal>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import { useGettext } from 'vue3-gettext'
import { useGroupwareAccountsStore, useModals } from '@opencloud-eu/web-pkg'
import { useAddressBooksStore } from '../composables/piniaStores/addressbooks'
import { useContactsStore } from '../composables/piniaStores/contacts'
import { useContactEditor } from '../composables/useContactEditor'
import { useCreateContact } from '../composables/useCreateContact'
import ContactCreateForm from './ContactCreateForm.vue'
import { createContactPayload, type ContactFormState } from '../helpers/contactForm'

defineProps<{
  variant: 'modal' | 'drawer'
}>()

const { $gettext } = useGettext()
const { dispatchModal } = useModals()

const accountsStore = useGroupwareAccountsStore()
const addressBooksStore = useAddressBooksStore()
const contactsStore = useContactsStore()
const contactEditor = useContactEditor()
const { createContact, isSaving } = useCreateContact()

const currentAccount = computed(() => unref(accountsStore.currentAccount))
const currentAddressBook = computed(() => unref(addressBooksStore.currentAddressBook))

const isCreateOpen = computed(() => unref(contactEditor.isCreateOpen))
const createFormState = computed(() => unref(contactEditor.createFormState))
const hasCreateChanges = computed(() => unref(contactEditor.hasCreateChanges))

const {
  closeCreateContact,
  closeCreateContactIfSafe,
  setCreateFormState,
  markCreateDirty,
  confirmDiscardChanges
} = contactEditor

const { upsertContact, setCurrentContact } = contactsStore

const isSubmitDisabled = computed(() => {
  return (
    !unref(hasCreateChanges) ||
    !unref(currentAccount)?.accountId ||
    !unref(currentAddressBook)?.id ||
    unref(isSaving)
  )
})

const onUpdateForm = (value: ContactFormState) => {
  setCreateFormState(value)
  markCreateDirty()
}

const requestClose = async () => {
  await closeCreateContactIfSafe()
}

const showSaveError = () => {
  dispatchModal({
    title: $gettext('Failed to save contact'),
    message: $gettext('The contact could not be created. Please try again.'),
    confirmText: $gettext('OK'),
    hasInput: false
  })
}

const onSubmit = async () => {
  const accountId = unref(currentAccount)?.accountId
  const addressBookId = unref(currentAddressBook)?.id

  if (!accountId || !addressBookId || !unref(hasCreateChanges)) {
    return
  }

  try {
    const createdContact = await createContact(
      accountId,
      createContactPayload(unref(createFormState), addressBookId)
    )

    upsertContact(createdContact)
    setCurrentContact(createdContact)
    closeCreateContact()
  } catch (error) {
    console.error('Failed to create contact:', error)
    showSaveError()
  }
}

const confirmRouteNavigation = async () => {
  if (!unref(isCreateOpen)) {
    return true
  }

  const shouldLeave = await confirmDiscardChanges()
  if (!shouldLeave) {
    return false
  }

  closeCreateContact()
  return true
}

onBeforeRouteLeave(confirmRouteNavigation)
onBeforeRouteUpdate(confirmRouteNavigation)
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
