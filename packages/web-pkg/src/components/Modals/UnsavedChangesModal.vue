<template>
  <span
    class="inline-block mb-4"
    v-text="$gettext('Your changes were not saved. Do you want to save them?')"
  />
  <div class="my-4"></div>
  <div class="flex justify-end items-center mt-4">
    <div class="oc-modal-body-actions-grid">
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { Modal, useModals } from '../../composables'

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
