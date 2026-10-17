<template>
  <span
    class="app-tag-count inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-semibold leading-none"
    :class="
      active
        ? 'bg-role-on-secondary text-role-secondary'
        : 'bg-role-secondary-container text-role-on-secondary-container'
    "
    v-text="count"
  />
</template>

<script setup lang="ts">
const { count, active = false } = defineProps<{
  count: number
  active?: boolean
}>()
</script>
