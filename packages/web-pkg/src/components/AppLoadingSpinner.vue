<template>
  <div class="flex items-center justify-center oc-height-1-1 w-full">
    <oc-spinner id="app-loading-spinner" size="large" :aria-hidden="true" aria-label="" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'AppLoadingSpinner'
})
</script>
