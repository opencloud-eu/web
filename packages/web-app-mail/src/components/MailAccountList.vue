<template>
  <div class="flex justify-center">
    <app-loading-spinner v-if="isLoading" />
    <oc-list v-else>
      <li v-for="account in accounts" :key="account.accountId">
        <oc-button
          v-oc-tooltip="account.name"
          class="account-list-item mt-4"
          no-hover
          appearance="raw"
          @click="$emit('select', account)"
        >
          <oc-avatar
            :class="{
              'border-2 border-role-secondary': currentAccount?.accountId === account.accountId
            }"
            :user-name="account.name"
          />
        </oc-button>
      </li>
    </oc-list>
  </div>
</template>

<script setup lang="ts">
import { AppLoadingSpinner } from '@opencloud-eu/web-pkg'
import type { MailAccount } from '../types'
import { useLoadAccounts } from '../composables/useLoadAccounts'
import { useAccountsStore } from '../composables/piniaStores/accounts'
import { storeToRefs } from 'pinia'

defineEmits<{
  (e: 'select', payload: MailAccount): void
}>()

const accountsStore = useAccountsStore()
const { accounts, currentAccount } = storeToRefs(accountsStore)

const { isLoading } = useLoadAccounts()
</script>
