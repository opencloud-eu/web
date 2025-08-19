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
<style>
@reference 'tailwindcss';

@layer components {
  .details-list dt,
  .details-list dd {
    @apply mb-2;
  }
  .details-list dd {
    @apply ml-4;
  }
  .details-list dt {
    @apply font-semibold whitespace-nowrap;
  }
  .details-list dd:last-of-type,
  .details-list dt:last-of-type {
    @apply mb-0;
  }
}
</style>
<style lang="scss">
.details-list {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  dt,
  dd {
    display: flex;
    align-items: center;
  }
}
</style>
