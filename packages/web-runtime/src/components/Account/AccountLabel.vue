<template>
  <div>
    <div v-text="label" />
    <div v-if="description || $slots.description" class="text-sm text-role-on-surface-variant">
      <slot name="description">{{ description }}</slot>
    </div>
  </div>
</template>

<script setup lang="ts">
const { label, description = '' } = defineProps<{
  label: string
  description?: string
}>()
</script>
