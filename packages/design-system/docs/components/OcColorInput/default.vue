<template>
  <oc-color-input v-model="color" label="Your favorite color" />
  <p v-if="color" class="flex items-center">
    So you like
    <span
      class="inline-block w-4 h-4 rounded-full mx-1 border-2 border-role-outline-variant"
      :style="`background-color:${color};`"
    />
    ? Nice!
  </p>
  <p v-else>I see, you don't like colors at all.</p>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const color = ref<string>('#ff0000')
</script>
