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
<style scoped>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-table-simple {
    @apply w-full;
  }
  .oc-table-simple-hover tr {
    @apply transition-colors duration-200 ease-in-out;
  }
  .oc-table-simple-hover tr:hover {
    @apply bg-role-secondary-container;
  }
  .oc-table-simple tr + tr {
    @apply border-t;
  }
}
</style>
