<template>
  <component
    :is="type"
    class="oc-table-cell"
    :class="{
      'break-all': wrap === 'break',
      'whitespace-nowrap': wrap === 'nowrap',
      'overflow-visible max-w-0': wrap === 'truncate',
      'text-left': alignH === 'left',
      'text-right': alignH === 'right',
      'text-center': alignH === 'center',
      'align-top': alignV === 'top',
      'align-middle': alignV === 'middle',
      'align-bottom': alignV === 'bottom',
      'w-px': width === 'shrink',
      'min-w-38': width === 'expand'
    }"
    @click="emit('click', $event)"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
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
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .oc-table-cell {
    @apply px-2 relative;
  }
}
</style>
