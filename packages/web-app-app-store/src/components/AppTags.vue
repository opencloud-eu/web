<template>
  <div class="flex gap-1">
    <oc-tag
      v-for="tag in app.tags"
      :key="`app-tag-${app.id}-${tag}`"
      data-testid="tag-button"
      size="small"
      class="whitespace-nowrap cursor-pointer"
      type="button"
      @click="emitClick(tag)"
    >
      <span class="mark-element">{{ tag }}</span>
    </oc-tag>
  </div>
</template>
<script setup lang="ts">
import { App } from '../types'

const { app } = defineProps<{
  app: App
}>()

const emit = defineEmits<{
  (e: 'click', tagName: string): void
}>()

const emitClick = (tagName: string) => {
  emit('click', tagName)
}
</script>
