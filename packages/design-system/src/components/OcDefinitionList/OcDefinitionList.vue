<template>
  <dl class="details-list grid grid-cols-[auto_minmax(0,1fr)]">
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
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .details-list dt,
  .details-list dd {
    @apply mb-2 flex items-center last-of-type:mb-0;
  }

  .details-list dd {
    @apply ml-4 font-normal;
  }

  .details-list dt {
    @apply font-semibold whitespace-nowrap;
  }
}
</style>
