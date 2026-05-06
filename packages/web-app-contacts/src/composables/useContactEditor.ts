import { computed, ref, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { useModals } from '@opencloud-eu/web-pkg'
import {
  createEmptyContactFormState,
  hasContactFormValue,
  type ContactFormState
} from '../helpers/contactForm'

const isCreateOpen = ref(false)
const createFormState = ref<ContactFormState>(createEmptyContactFormState())
const isCreateDirty = ref(false)

export const useContactEditor = () => {
  const { dispatchModal } = useModals()
  const { $gettext } = useGettext()

  const hasCreateChanges = computed(() => {
    return hasContactFormValue(unref(createFormState))
  })

  const openCreateContact = () => {
    isCreateOpen.value = true
  }

  const closeCreateContact = () => {
    isCreateOpen.value = false
    createFormState.value = createEmptyContactFormState()
    isCreateDirty.value = false
  }

  const setCreateFormState = (value: ContactFormState) => {
    createFormState.value = value
  }

  const markCreateDirty = () => {
    isCreateDirty.value = true
  }

  const confirmDiscardChanges = () => {
    if (!unref(isCreateOpen) || !unref(hasCreateChanges) || !unref(isCreateDirty)) {
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

  const closeCreateContactIfSafe = async () => {
    const shouldClose = await confirmDiscardChanges()
    if (!shouldClose) {
      return false
    }

    closeCreateContact()
    return true
  }

  const runWithDiscardConfirmation = async (action: () => void | Promise<void>) => {
    const shouldProceed = await confirmDiscardChanges()
    if (!shouldProceed) {
      return false
    }

    await action()
    closeCreateContact()
    return true
  }

  return {
    isCreateOpen,
    createFormState,
    isCreateDirty,
    hasCreateChanges,
    openCreateContact,
    closeCreateContact,
    closeCreateContactIfSafe,
    setCreateFormState,
    markCreateDirty,
    confirmDiscardChanges,
    runWithDiscardConfirmation
  }
}
