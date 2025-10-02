<template>
  <oc-radio
    v-for="o in availableOptions"
    :key="o"
    v-model="inputValue"
    :option="o"
    :label="o"
    class="block"
  />
  <p>Selection: {{ inputValue || 'None' }}</p>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const availableOptions = ['Folder', 'Space', 'File']
const inputValue = ref(false)
</script>
