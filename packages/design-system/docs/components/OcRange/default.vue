<template>
  <oc-range v-model="value" label="Tile size" :min="1" :max="6" />

  <p>Selected value: {{ value }}</p>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const value = ref(3)
</script>
