<template>
  <no-content-message
    v-if="hasError"
    class="pdf-viewer-load-error absolute inset-0 p-4"
    icon="file-damage"
    icon-fill-type="line"
    role="alert"
  >
    <template #message>
      <span v-text="$gettext('The PDF file could not be opened')" />
    </template>
  </no-content-message>
  <app-loading-spinner v-else-if="isLoading" class="absolute inset-0" />
</template>

<script setup lang="ts">
import { AppLoadingSpinner, NoContentMessage } from '@opencloud-eu/web-pkg'

defineProps<{ isLoading?: boolean; hasError?: boolean }>()
</script>
