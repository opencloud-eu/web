<template>
  <div class="oc-bubble-menu"><slot /></div>
</template>

<script setup lang="ts">
export interface Slots {
  /**
   * @docs Content of the bubble menu.
   */
  default?: () => unknown
}

defineSlots<Slots>()
</script>

<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-bubble-menu {
    @apply inline-flex items-center rounded-full border border-role-surface-container-highest bg-role-surface-container-low px-1 py-1.5 shadow-md sm:px-1.5 sm:py-2;
  }
}
</style>
