<template>
  <span
    class="oc-display-inline-block mb-4"
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

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { Modal, useModals } from '../../composables'

export default defineComponent({
  name: 'UnsavedChangesModal',
  props: {
    modal: { type: Object as PropType<Modal>, required: true },
    closeCallback: { type: Function as PropType<() => void>, required: true }
  },
  emits: ['cancel', 'confirm'],
  setup(props) {
    const { removeModal } = useModals()
    const onClose = () => {
      removeModal(props.modal.id)
      props.closeCallback()
    }

    return {
      onClose
    }
  }
})
</script>
