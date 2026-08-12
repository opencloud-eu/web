<template>
  <ul class="mb-0 p-0">
    <li v-for="resource in resources" :key="resource.label">
      <a
        :href="resource.url"
        data-testid="resource-link"
        target="_blank"
        class="inline-flex items-center"
      >
        <oc-icon
          v-if="resource.icon"
          data-testid="resource-icon"
          :name="resource.icon"
          size-class="size-5"
          class="mr-1"
        />
        <span data-testid="resource-label">{{ resource.label }}</span>
      </a>
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

const resources = computed(() => {
  return (app.resources || []).filter((resource) => {
    if (isEmpty(resource.url) || isEmpty(resource.label)) {
      return false
    }
    try {
      new URL(resource.url)
    } catch {
      return false
    }
    return true
  })
})
</script>
