<template>
  <table :class="tableClasses">
    <slot />
  </table>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface Props {
  /**
   * @docs Determines if the table rows should have a hover effect.
   * @default false
   */
  hover?: boolean
}

export interface Slots {
  /**
   * @docs Table content.
   */
  default?: () => unknown
}

const { hover = false } = defineProps<Props>()
defineSlots<Slots>()

const tableClasses = computed(() => {
  const result = ['oc-table-simple']
  if (hover) {
    result.push('oc-table-simple-hover')
  }
  return result
})
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-table-simple-hover tr:hover {
    @apply bg-role-secondary-container;
  }
  .oc-table-simple tr + tr {
    @apply border-t;
  }
}
</style>
<style lang="scss">
.oc-table-simple {
  border-collapse: collapse;
  border-spacing: 0;
  width: 100%;

  &-hover tr {
    transition: background-color $transition-duration-short ease-in-out;
  }
}
</style>
