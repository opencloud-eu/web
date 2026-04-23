<template>
  <oc-file-input
    v-model="files"
    label="Select file"
    description-message="Select an image to see a preview"
  />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const files = ref<FileList>()

watch(files, (newFiles) => {
  console.log(newFiles)
})
</script>
