<template>
  <div class="mt-12">
    <div class="flex flex-col items-center space-info text-center">
      <oc-icon name="layout-grid" size="xxlarge" />
      <p v-translate>Select a space to view details</p>
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'SpaceNoSelection'
})
</script>
