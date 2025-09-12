<template>
  <div
    :class="[
      'oc-loader',
      'block',
      'after:block',
      'bg-role-surface-container',
      'after:bg-role-secondary',
      'w-full',
      'after:w-0',
      'after:h-full',
      'overflow-hidden',
      'after:animate-loading-bar',
      { 'oc-loader-flat rounded-none h-1': flat },
      { 'rounded-[500px] h-4': !flat }
    ]"
    :aria-label="ariaLabel"
  />
</template>

<script setup lang="ts">
export interface Props {
  /**
   * @docs Aria label to describe the loader's purpose for screen readers.
   */
  ariaLabel?: string
  /**
   * @docs Determines if the loader is visually flat.
   * @default false
   */
  flat?: boolean
}

const { ariaLabel = 'Loading', flat = false } = defineProps<Props>()
</script>
<style scoped>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-loader {
    @apply my-5 align-baseline relative after:absolute;
  }
}
</style>
