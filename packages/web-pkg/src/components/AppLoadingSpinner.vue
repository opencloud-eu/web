<template>
  <div class="flex items-center justify-center size-full">
    <oc-spinner id="app-loading-spinner" size="large" :aria-hidden="true" aria-label="" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'AppLoadingSpinner'
})
</script>
