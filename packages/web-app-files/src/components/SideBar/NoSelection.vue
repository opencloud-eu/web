<template>
  <div id="oc-no-selection" class="oc-text-center mt-12">
    <oc-icon size="xxlarge" name="drag-drop" fill-type="line" />
    <p data-testid="selectedFilesText" v-text="selectedFilesString" />
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'NoSelection',
  computed: {
    selectedFilesString() {
      return this.$gettext('Select a file or folder to view details')
    }
  }
})
</script>
