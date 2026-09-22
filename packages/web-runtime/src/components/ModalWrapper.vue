<template>
  <oc-modal
    v-for="(modal, index) in modals"
    :key="modal.id"
    :active="index === modals.length - 1"
    :element-id="modal.elementId"
    :element-class="modal.elementClass"
    :title="modal.title"
    :message="modal.message"
    :has-input="modal.hasInput"
    :input-description="modal.inputDescription"
    :input-error="modal.inputError"
    :input-label="modal.inputLabel"
    :input-selection-range="modal.inputSelectionRange"
    :input-type="modal.inputType"
    :input-value="modal.inputValue"
    :input-required-mark="modal.inputRequiredMark"
    :hide-actions="modal.hideActions"
    :hide-confirm-button="modal.hideConfirmButton"
    :hide-cancel-button="modal.hideCancelButton"
    :button-confirm-text="modal.confirmText"
    :button-confirm-disabled="modal.confirmDisabled"
    :contextual-helper-label="modal.contextualHelperLabel"
    :contextual-helper-data="modal.contextualHelperData"
    :focus-trap-initial="modal.focusTrapInitial"
    :is-loading="modal.isLoading"
    @cancel="onModalCancel(modal)"
    @confirm="onModalConfirm(modal, $event)"
    @input="onModalInput(modal, $event)"
  >
    <template v-if="modal.customComponent" #content>
      <component
        :is="modal.customComponent"
        :ref="(instance: unknown) => setCustomComponentRef(modal.id, instance)"
        :modal="modal"
        v-bind="modal.customComponentAttrs?.() || {}"
        @confirm="onModalConfirm(modal, $event)"
        @cancel="onModalCancel(modal)"
        @update:confirm-disabled="onModalConfirmDisabled(modal, $event)"
      />
    </template>
  </oc-modal>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import {
  useLoadingService,
  useModals,
  type CustomModalComponentInstance,
  type Modal
} from '@opencloud-eu/web-pkg'

const loadingService = useLoadingService()

const modalStore = useModals()
const { modals } = storeToRefs(modalStore)
const { updateModal, removeModal } = modalStore

// Every modal in the stack stays mounted, so the components below the topmost
// one keep their state while it is open.
const customComponentRefs = new Map<Modal['id'], CustomModalComponentInstance>()

const setCustomComponentRef = (id: Modal['id'], instance: unknown) => {
  if (!instance) {
    customComponentRefs.delete(id)
    return
  }
  customComponentRefs.set(id, instance as CustomModalComponentInstance)
}

const onModalConfirm = async (modal: Modal, value?: unknown) => {
  const customComponent = customComponentRefs.get(modal.id)

  try {
    updateModal(modal.id, 'isLoading', true)

    if (modal.onConfirm) {
      await loadingService.addTask(async () => {
        await modal.onConfirm(value)
      })
    } else if (customComponent?.onConfirm) {
      await loadingService.addTask(() => customComponent.onConfirm(value))
    }
  } catch {
    updateModal(modal.id, 'isLoading', false)
    return
  }

  removeModal(modal.id)
}

const onModalCancel = (modal: Modal) => {
  if (modal.onCancel) {
    modal.onCancel()
  } else {
    customComponentRefs.get(modal.id)?.onCancel?.()
  }

  removeModal(modal.id)
}

const onModalInput = (modal: Modal, value: string) => {
  if (!modal.onInput) {
    return
  }

  // provide onError callback
  const setError = (error: string) => updateModal(modal.id, 'inputError', error)
  modal.onInput(value, setError)
}

const onModalConfirmDisabled = (modal: Modal, value: boolean) => {
  updateModal(modal.id, 'confirmDisabled', value)
}
</script>
