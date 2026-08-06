<template>
  <oc-button @click="showModal">Show modal</oc-button>
  <oc-modal
    v-if="modalActive"
    title="Modal title"
    :has-input="true"
    input-label="Folder name"
    @confirm="confirm"
    @cancel="hideModal"
  />
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
