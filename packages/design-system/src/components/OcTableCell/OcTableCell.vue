<template>
  <component :is="type" :class="cellClasses" @click="emit('click', $event)">
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface Props {
  alignH?: 'left' | 'center' | 'right'
  alignV?: 'top' | 'middle' | 'bottom'
  type?: 'td' | 'th'
  width?: 'auto' | 'shrink' | 'expand'
  wrap?: 'break' | 'nowrap' | 'truncate'
}

const {
  alignH = 'left',
  alignV = 'middle',
  type = 'td',
  width = 'auto',
  wrap
} = defineProps<Props>()

const emit = defineEmits(['click'])

const cellClasses = computed(() => {
  const classes = [
    'oc-table-cell',
    `oc-table-cell-align-${alignH}`,
    `oc-table-cell-align-${alignV}`,
    `oc-table-cell-width-${width}`
  ]
  if (wrap) {
    classes.push(`oc-text-${wrap}`)
  }
  return classes
})
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-table-cell {
    @apply px-2 relative;
  }
  .oc-table-cell-align-left {
    @apply text-left;
  }
  .oc-table-cell-align-center {
    @apply text-center;
  }
  .oc-table-cell-align-right {
    @apply text-right;
  }
  .oc-table-cell-align-top {
    @apply align-top;
  }
  .oc-table-cell-align-middle {
    @apply align-middle;
  }
  .oc-table-cell-align-bottom {
    @apply align-bottom;
  }
  .oc-table-cell-width-shrink {
    @apply w-px;
  }
  .oc-table-cell-width-expand {
    @apply min-w-38;
  }
}
</style>
