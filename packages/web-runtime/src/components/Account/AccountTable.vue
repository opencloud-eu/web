<template>
  <div class="account-table">
    <slot name="header" :title="title">
      <h2 class="account-table-title flex items-center" :class="subtitle ? 'mb-2' : ''">
        {{ title }}
        <oc-tag
          v-if="newTag"
          :rounded="true"
          color="primary"
          appearance="filled"
          size="small"
          class="ml-2 account-table-new-tag"
          v-text="$gettext('NEW')"
        />
      </h2>
      <p v-if="subtitle" class="text-sm mt-0 mb-4" v-text="subtitle" />
    </slot>
    <oc-table-simple>
      <colgroup>
        <col style="width: 30%" />
        <col style="width: 40%" />
        <col style="width: 30%" />
      </colgroup>
      <oc-table-head :class="{ 'oc-invisible-sr': !showHead }">
        <oc-table-tr>
          <template v-for="field in fields" :key="typeof field === 'string' ? field : field.label">
            <oc-table-th v-if="typeof field === 'string'">{{ field }}</oc-table-th>
            <oc-table-th
              v-else
              :align-h="field.alignH || 'left'"
              :class="{ 'oc-invisible-sr': field.hidden }"
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
    title: {
      type: String,
      required: true
    },
    fields: {
      type: Array<string | AccountTableCell>,
      required: true
    },
    showHead: { type: Boolean, required: false, default: false },
    newTag: { type: Boolean, required: false, default: false },
    subtitle: {
      type: String,
      required: false,
      default: ''
    }
  }
})
</script>
<style>
@reference 'tailwindcss';

@layer utilities {
  .account-table td {
    @apply py-2 md:py-0;
  }
  .account-table tr {
    @apply pb-1 md:pb-0;
  }
}
</style>
<style lang="scss">
@media (max-width: $oc-breakpoint-small-max) {
  .account-table {
    tr {
      display: block;
      height: 100% !important;
    }

    td {
      display: block !important;
      width: 100% !important;
    }

    h2 {
      font-weight: var(--oc-font-weight-default);
    }
  }
}

.account-table {
  tr {
    border-top: 0;
    border-bottom: 0.5px solid var(--oc-role-outline-variant);
    height: var(--oc-size-height-table-row);
  }

  @media (min-width: $oc-breakpoint-medium-default) {
    td > .checkbox-cell-wrapper {
      display: flex;
      justify-content: end;
      align-items: center;
      min-height: var(--oc-size-height-table-row);
    }
  }

  @media (max-width: $oc-breakpoint-medium-default) {
    col {
      width: auto !important;
    }
  }
}
</style>
