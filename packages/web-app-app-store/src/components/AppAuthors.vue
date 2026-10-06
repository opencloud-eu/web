<template>
  <ul class="inline-flex flex-wrap justify-end gap-x-1 m-0 p-0">
    <li v-for="(author, index) in authors" :key="author.name" class="app-author-item">
      <a v-if="author.url" :href="author.url" data-testid="author-link" target="_blank">
        {{ author.name }}
      </a>
      <span v-else data-testid="author-label">{{ author.name }}</span>
      <span v-if="index < authors.length - 1">,</span>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { App } from '../types'
import { isValidUrl } from '../helpers'

const { app } = defineProps<{
  app: App
}>()

const authors = computed(() => {
  return (app.authors || []).filter((author) => {
    return author.name && (!author.url || isValidUrl(author.url))
  })
})
</script>
