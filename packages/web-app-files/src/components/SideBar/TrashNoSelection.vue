<template>
  <div id="oc-trash-no-selection" class="oc-text-center mt-12">
    <oc-icon size="xxlarge" name="delete-bin" fill-type="line" />
    <p data-testid="selectTrashText" v-text="$gettext('Select a trash bin to view details')" />
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'TrashNoSelection'
})
</script>
