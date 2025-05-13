<template>
  <oc-color-input v-model="color" label="Your favorite color" />
  <p v-if="color">
    So you like
    <span class="color-box" :style="`background-color:${color};`"
      >&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span
    >
    ? Nice!
  </p>
  <p v-else>I see, you don't like colors at all.</p>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const color = ref<string>('#ff0000')
</script>

<style scoped>
.color-box {
  border: 1px solid black;
  border-radius: 5px;
}
</style>
