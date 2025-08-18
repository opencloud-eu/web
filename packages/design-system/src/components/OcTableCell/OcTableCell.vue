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
@reference 'tailwindcss';

@layer components {
  .oc-table-cell {
    @apply px-2;
  }
}
</style>
<style lang="scss">
.oc-table-cell {
  position: relative;

  &-align {
    &-left {
      text-align: left;
    }

    &-center {
      text-align: center;
    }

    &-right {
      text-align: right;
    }

    &-top {
      vertical-align: top;
    }

    &-middle {
      vertical-align: middle;
    }

    &-bottom {
      vertical-align: bottom;
    }
  }

  &-width {
    &-shrink {
      width: 1px;
    }

    &-expand {
      min-width: 150px;
    }
  }
}
</style>
