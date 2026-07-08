<template>
  <div id="oc-no-selection" class="text-center mt-12">
    <oc-icon size-class="size-22" name="drag-drop" fill-type="line" />
    <p data-testid="selectedFilesText" v-text="selectedFilesString" />
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'

const { $gettext } = useGettext()
const selectedFilesString = computed(() => $gettext('Select a file or folder to view details'))
</script>
