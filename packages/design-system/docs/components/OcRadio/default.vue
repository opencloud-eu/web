<template>
  <oc-radio v-model="inputValue" :option="true" label="Some radio" />
  <p>Checked: {{ inputValue || false }}</p>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const inputValue = ref(false)
</script>
