<template>
  <ul class="mb-0 p-0">
    <li v-for="author in authors" :key="author.name" class="app-author-item">
      <a v-if="author.url" :href="author.url" data-testid="author-link" target="_blank">
        {{ author.name }}
      </a>
      <span v-else data-testid="author-label">{{ author.name }}</span>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { App } from '../types'
import { isEmpty } from 'lodash-es'

const { app } = defineProps<{
  app: App
}>()

const authors = computed(() => {
  return (app.authors || []).filter((author) => {
    if (isEmpty(author.name)) {
      return false
    }
    if (!isEmpty(author.url)) {
      try {
        new URL(author.url)
      } catch {
        return false
      }
    }
    return true
  })
})
</script>
