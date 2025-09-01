<template>
  <object class="pdf-viewer size-full overflow-hidden" :data="url" :type="objectType" />
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  props: {
    url: {
      type: String,
      required: true
    }
  },
  setup() {
    const isSafari =
      navigator.userAgent?.includes('Safari') && !navigator.userAgent?.includes('Chrome')
    const objectType = isSafari ? undefined : 'application/pdf'

    return {
      objectType
    }
  }
})
</script>
