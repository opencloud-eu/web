<template>
  <div class="flex flex-wrap gap-1">
    <oc-tag
      v-for="tag in app.tags"
      :key="`app-tag-${app.id}-${tag}`"
      data-testid="tag-button"
      rounded
      size="small"
      class="relative max-w-full whitespace-nowrap cursor-pointer"
      type="button"
      :title="tag"
      @click="emit('click', tag)"
    >
      <oc-filter-highlight class="truncate" :text="tag" :term="term" />
    </oc-tag>
  </div>
</template>
<script setup lang="ts">
import { App } from '../types'
import { OcFilterHighlight } from '@opencloud-eu/design-system/components'

const { app, term = '' } = defineProps<{
  app: App
  term?: string
}>()

const emit = defineEmits<{
  (e: 'click', tagName: string): void
}>()
</script>
