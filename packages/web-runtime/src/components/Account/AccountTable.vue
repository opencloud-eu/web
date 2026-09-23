<template>
  <div class="account-table">
    <oc-table-simple>
      <colgroup>
        <col v-for="(width, index) in columnWidths" :key="index" :style="{ width }" />
      </colgroup>
      <oc-table-head :class="{ 'sr-only': !showHead }">
        <oc-table-tr>
          <template v-for="field in fields" :key="typeof field === 'string' ? field : field.label">
            <oc-table-th v-if="typeof field === 'string'">{{ field }}</oc-table-th>
            <oc-table-th
              v-else
              :align-h="field.alignH || 'left'"
              :class="{ 'sr-only': field.hidden }"
            >
              {{ field.label }}
            </oc-table-th>
          </template>
        </oc-table-tr>
      </oc-table-head>
      <oc-table-body>
        <slot />
      </oc-table-body>
    </oc-table-simple>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type AccountTableCell = {
  label: string
  alignH?: 'left' | 'center' | 'right'
  hidden?: boolean
}

const { fields, showHead = false } = defineProps<{
  fields: Array<string | AccountTableCell>
  showHead?: boolean
}>()

// the first column holds label and description, the remaining columns share the rest
const columnWidths = computed(() => {
  const restWidth = `${40 / (fields.length - 1)}%`
  return ['60%', ...Array(fields.length - 1).fill(restWidth)]
})
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer utilities {
  .account-table table {
    @apply block md:table;
  }

  .account-table tbody {
    @apply block md:table-row-group;
  }

  .account-table td {
    @apply block md:table-cell py-2 md:py-3 px-0;
  }

  .account-table th {
    @apply px-0;
  }

  .account-table td > .checkbox-cell-wrapper {
    @apply md:flex md:justify-end md:items-center py-2 md:py-0 w-full md:w-auto min-h-10.5 md:min-h-auto;
  }

  .account-table tr {
    @apply block md:table-row pb-1 md:pb-0 border-t-0 border-b h-full md:h-10.5;
  }

  .account-table tr:last-child {
    @apply border-b-0;
  }
}
</style>
