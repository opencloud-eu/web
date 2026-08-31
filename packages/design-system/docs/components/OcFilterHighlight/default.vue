<template>
  <div class="flex flex-col gap-2">
    <oc-text-input v-model="term" label="Filter term" />
    <oc-filter-highlight text="Marie Curie" :term="term" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const term = ref('curie')
</script>
