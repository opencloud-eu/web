<template>
  <span
    class="inline-block mb-4"
    v-text="$gettext('Your changes were not saved. Do you want to save them?')"
  />
  <teleport defer :to="`#${modalActionsTarget(modal)}`">
    <oc-button
      class="oc-modal-body-actions-secondary ml-2"
      :disabled="modal.isLoading"
      @click="onClose"
    >
      {{ $gettext("Don't Save") }}
    </oc-button>
  </teleport>
</template>

<script setup lang="ts">
import { Modal, modalActionsTarget, useModals } from '../../composables'

const { modal, closeCallback } = defineProps<{
  modal: Modal
  closeCallback: () => void
}>()

defineEmits<{
  (e: 'cancel'): void
  (e: 'confirm'): void
}>()

const { removeModal } = useModals()
const onClose = () => {
  removeModal(modal.id)
  closeCallback()
}
</script>
