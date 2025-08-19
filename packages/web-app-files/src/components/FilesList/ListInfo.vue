<template>
  <div class="text-center">
    <p data-testid="files-list-footer-info" class="oc-text-muted" v-text="resourceContentsText"></p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useResourceContents } from '@opencloud-eu/web-pkg'

export default defineComponent({
  setup: () => {
    const { resourceContentsText } = useResourceContents()
    return { resourceContentsText }
  }
})
</script>
