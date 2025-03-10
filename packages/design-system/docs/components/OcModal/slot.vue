<template>
  <oc-button @click="showModal">Show modal</oc-button>
  <oc-modal v-if="modalActive" title="Modal title" :hide-actions="true">
    <template #content>
      <span>Your changes were not saved. Do you want to save them?</span>
      <div class="oc-flex oc-flex-right oc-flex-middle oc-mt-m">
        <div class="oc-modal-body-actions-grid">
          <oc-button
            class="oc-modal-body-actions-cancel oc-ml-s"
            appearance="outline"
            @click="hideModal"
            >Cancel
          </oc-button>
          <oc-button
            class="oc-modal-body-actions-secondary oc-ml-s"
            appearance="outline"
            @click="hideModal"
          >
            Don't Save
          </oc-button>
          <oc-button
            class="oc-modal-body-actions-confirm oc-ml-s"
            appearance="filled"
            @click="confirm"
            >Save
          </oc-button>
        </div>
      </div>
    </template>
  </oc-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const modalActive = ref(false)

const showModal = () => {
  modalActive.value = true
}

const hideModal = () => {
  modalActive.value = false
}

const confirm = () => {
  // handle confirm...

  modalActive.value = false
}
</script>
