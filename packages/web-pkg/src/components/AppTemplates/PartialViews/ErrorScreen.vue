<template>
  <div class="oc-text-center flex justify-center items-center oc-height-1-1">
    <oc-icon size="xxlarge" name="error-warning" fill-type="line" />
    <p v-if="message" class="text-xl">{{ message }}</p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'ErrorScreen',
  props: {
    /**
     * Error message passed from external app
     */
    message: {
      default: '',
      type: String,
      required: false
    }
  }
})
</script>
