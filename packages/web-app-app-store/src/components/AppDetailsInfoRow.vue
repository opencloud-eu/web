<template>
  <div
    class="app-details-info-row flex py-2 border-b border-role-surface-container-highest last:border-b-0"
    :class="stacked ? 'flex-col gap-1' : 'items-baseline justify-between gap-4'"
  >
    <dt class="text-sm text-role-on-surface-variant shrink-0" v-text="label" />
    <dd class="m-0 text-sm font-semibold min-w-0" :class="{ 'text-right': !stacked }">
      <slot />
    </dd>
  </div>
</template>

<script setup lang="ts">
const { label, stacked = false } = defineProps<{
  label: string
  stacked?: boolean
}>()

defineSlots<{
  default: () => unknown
}>()
</script>
