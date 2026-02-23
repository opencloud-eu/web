<template>
  <div class="mt-12">
    <div class="flex flex-col items-center space-info text-center">
      <oc-icon name="layout-grid" size="xxlarge" />
      <p v-text="$gettext('Select a space to view details')" />
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'SpaceNoSelection'
})
</script>
