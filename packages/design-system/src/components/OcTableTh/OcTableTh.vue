<template>
  <oc-table-cell
    type="th"
    :align-h="alignH"
    :align-v="alignV"
    :width="width"
    :wrap="wrap"
    class="oc-th"
    @click="$emit('click', $event)"
  >
    <slot />
  </oc-table-cell>
</template>

<script setup lang="ts">
import OcTableCell from '../OcTableCell/OcTableCell.vue'

export interface Props {
  alignH?: 'left' | 'center' | 'right'
  alignV?: 'top' | 'middle' | 'bottom'
  width?: 'auto' | 'shrink' | 'expand'
  wrap?: 'break' | 'nowrap' | 'truncate'
}

const { alignH = 'left', alignV = 'middle', width = 'auto', wrap } = defineProps<Props>()
defineEmits(['click'])
</script>

<style lang="scss">
.oc-th {
  font-weight: inherit;

  &[aria-sort] {
    cursor: pointer;
  }
}
</style>
