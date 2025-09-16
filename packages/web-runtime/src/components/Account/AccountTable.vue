<template>
  <div class="account-table">
    <oc-table-simple>
      <colgroup>
        <col class="w-auto md:w-[30%]" />
        <col class="w-auto md:w-[40%]" />
        <col class="w-auto md:w-[30%]" />
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

<script lang="ts">
import { defineComponent } from 'vue'

type AccountTableCell = {
  label: string
  alignH?: 'left' | 'center' | 'right'
  hidden?: boolean
}

export default defineComponent({
  name: 'AccountTable',
  props: {
    fields: {
      type: Array<string | AccountTableCell>,
      required: true
    },
    showHead: { type: Boolean, required: false, default: false }
  }
})
</script>
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer utilities {
  .account-table td {
    @apply block md:table-cell py-2 md:py-0;
  }

  .account-table td > .checkbox-cell-wrapper {
    @apply md:flex md:justify-end md:items-center py-2 md:py-0 w-full md:w-auto min-h-10.5 md:min-h-auto;
  }

  .account-table tr {
    @apply block md:table-row pb-1 md:pb-0 border-t-0 border-b h-full md:h-10.5;
  }
}
</style>
