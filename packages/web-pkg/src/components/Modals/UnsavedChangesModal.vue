<template>
  <span
    class="inline-block mb-4"
    v-text="$gettext('Your changes were not saved. Do you want to save them?')"
  />
  <teleport defer :to="`#${modalActionsTarget(modal)}`">
    <oc-button class="oc-modal-body-actions-cancel ml-2" @click="$emit('cancel')">
      {{ $gettext('Cancel') }}
    </oc-button>
    <oc-button class="oc-modal-body-actions-secondary ml-2" @click="onClose">
      {{ $gettext("Don't Save") }}
    </oc-button>
    <oc-button
      class="oc-modal-body-actions-confirm ml-2"
      appearance="filled"
      @click="$emit('confirm')"
    >
      {{ $gettext('Save') }}
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
