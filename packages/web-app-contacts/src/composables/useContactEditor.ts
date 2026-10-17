import { computed, ref, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { isEqual } from 'lodash-es'
import { useModals } from '@opencloud-eu/web-pkg'
import {
  createContactFormState,
  createEmptyContactFormState,
  hasContactFormValue,
  type ContactFormState
} from '../helpers/contactForm'
import type { Contact } from '../types'

const isEditorOpen = ref(false)
// the contact being edited, unset while creating a new contact
const editedContact = ref<Contact>()
const formState = ref<ContactFormState>(createEmptyContactFormState())
const initialFormState = ref<ContactFormState>(unref(formState))
const isDirty = ref(false)

export const useContactEditor = () => {
  const { dispatchModal } = useModals()
  const { $gettext } = useGettext()

  const hasChanges = computed(() => {
    if (unref(editedContact)) {
      return !isEqual(unref(formState), unref(initialFormState))
    }
    return hasContactFormValue(unref(formState))
  })

  const openEditor = (contact?: Contact) => {
    const state = contact ? createContactFormState(contact) : createEmptyContactFormState()
    editedContact.value = contact
    formState.value = state
    initialFormState.value = state
    isDirty.value = false
    isEditorOpen.value = true
  }

  const openCreateContact = () => {
    openEditor()
  }

  const openEditContact = (contact: Contact) => {
    openEditor(contact)
  }

  const closeEditor = () => {
    isEditorOpen.value = false
    editedContact.value = undefined
    formState.value = createEmptyContactFormState()
    initialFormState.value = unref(formState)
    isDirty.value = false
  }

  const setFormState = (value: ContactFormState) => {
    formState.value = value
  }

  const markDirty = () => {
    isDirty.value = true
  }

  const confirmDiscardChanges = () => {
    if (!unref(isEditorOpen) || !unref(hasChanges) || !unref(isDirty)) {
      return true
    }

    return new Promise<boolean>((resolve) => {
      dispatchModal({
        title: $gettext('Discard changes?'),
        message: $gettext(
          'You have unsaved changes. Do you want to discard them and leave this screen?'
        ),
        confirmText: $gettext('Discard'),
        hasInput: false,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      })
    })
  }

  const closeEditorIfSafe = async () => {
    const shouldClose = await confirmDiscardChanges()
    if (!shouldClose) {
      return false
    }

    closeEditor()
    return true
  }

  const runWithDiscardConfirmation = async (action: () => void | Promise<void>) => {
    const shouldProceed = await confirmDiscardChanges()
    if (!shouldProceed) {
      return false
    }

    await action()
    closeEditor()
    return true
  }

  return {
    isEditorOpen,
    editedContact,
    formState,
    initialFormState,
    isDirty,
    hasChanges,
    openCreateContact,
    openEditContact,
    closeEditor,
    closeEditorIfSafe,
    setFormState,
    markDirty,
    confirmDiscardChanges,
    runWithDiscardConfirmation
  }
}
