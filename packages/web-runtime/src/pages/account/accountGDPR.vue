<template>
  <div id="account-gdpr">
    <h1 class="mt-0" v-text="$gettext('GDPR')" />
    <account-table
      :fields="[
        $gettext('GDPR action name'),
        $gettext('GDPR action description'),
        $gettext('GDPR actions')
      ]"
    >
      <oc-table-tr>
        <oc-table-td>{{ $gettext('GDPR export') }}</oc-table-td>
        <oc-table-td>
          <span v-text="$gettext('Request a personal data export according to §20 GDPR.')" />
        </oc-table-td>
        <oc-table-td data-testid="gdpr-export">
          <gdpr-export />
        </oc-table-td>
      </oc-table-tr>
    </account-table>
  </div>
</template>
<script setup lang="ts">
import { useGettext } from 'vue3-gettext'
import AccountTable from '../../components/Account/AccountTable.vue'
import GdprExport from '../../components/Account/GdprExport.vue'

const { $gettext } = useGettext()
</script>
