<template>
  <oc-file-input v-model="files" label="Select file" />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const files = ref<FileList>()

watch(files, (newFiles) => {
  console.log(newFiles)
})
</script>
