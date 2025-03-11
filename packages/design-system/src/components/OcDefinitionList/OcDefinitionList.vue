<template>
  <dl class="details-list">
    <!-- eslint-disable-next-line vue/no-v-for-template-key -->
    <template v-for="item in items" :key="item.term">
      <dt>{{ item.term }}</dt>
      <dd>{{ item.definition }}</dd>
    </template>
  </dl>
</template>

<script setup lang="ts">
interface DefinitionItem {
  term: string
  definition: string
}

export interface Props {
  /**
   * @docs List of items to be displayed. Please refer to the component source for the `DefinitionItem` type definition.
   */
  items: DefinitionItem[]
}

const { items } = defineProps<Props>()
</script>

<style lang="scss">
.details-list {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  dt,
  dd {
    margin-bottom: var(--oc-space-small);
    display: flex;
    align-items: center;
  }
  dt {
    font-weight: bold;
    white-space: nowrap;
  }
  dd {
    margin-inline-start: var(--oc-space-medium);
  }

  dd:last-of-type,
  dt:last-of-type {
    margin-bottom: 0 !important;
  }
}
</style>
