<template>
  <ul class="mb-0 p-0">
    <li v-for="resource in resources" :key="resource.label">
      <a
        :href="resource.url"
        data-testid="resource-link"
        target="_blank"
        class="flex items-center justify-between gap-2"
      >
        <span class="inline-flex items-center min-w-0">
          <oc-icon
            v-if="resource.icon"
            data-testid="resource-icon"
            :name="resource.icon"
            size-class="size-5"
            class="mr-1"
          />
          <span data-testid="resource-label" class="truncate">{{ resource.label }}</span>
        </span>
        <oc-icon name="external-link" fill-type="line" size-class="size-4" class="shrink-0" />
      </a>
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

const resources = computed(() => {
  return (app.resources || []).filter((resource) => {
    return resource.label && isValidUrl(resource.url)
  })
})
</script>
