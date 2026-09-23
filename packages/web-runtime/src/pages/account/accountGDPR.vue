<template>
  <div id="account-gdpr">
    <account-heading
      :title="$gettext('GDPR')"
      :subtitle="$gettext('Your personal data and privacy rights.')"
    />
    <account-table :fields="[$gettext('GDPR action name'), $gettext('GDPR actions')]">
      <oc-table-tr>
        <oc-table-td>
          <account-label
            :label="$gettext('GDPR export')"
            :description="$gettext('Request a personal data export according to §20 GDPR.')"
          />
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
import AccountHeading from '../../components/Account/AccountHeading.vue'
import AccountLabel from '../../components/Account/AccountLabel.vue'
import GdprExport from '../../components/Account/GdprExport.vue'

const { $gettext } = useGettext()
</script>
