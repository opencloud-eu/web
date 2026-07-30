<template>
  <oc-pagination-inline v-model:current-page="currentPage" :pages="3" />
</template>

<script setup lang="ts">
import { ref } from 'vue'

const currentPage = ref(1)
</script>
