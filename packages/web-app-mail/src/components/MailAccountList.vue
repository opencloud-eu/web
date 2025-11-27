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
          @click="onSelectAccount(account)"
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
import { useMailboxesStore } from '../composables/piniaStores/mailboxes'
import { useLoadMailboxes } from '../composables/useLoadMailboxes'
import { unref } from 'vue'
import { useLoadMails } from '../composables/useLoadMails'
import { useMailsStore } from '../composables/piniaStores/mails'

const accountsStore = useAccountsStore()
const { accounts, currentAccount } = storeToRefs(accountsStore)
const { setCurrentAccount } = accountsStore
const mailboxesStore = useMailboxesStore()
const { mailboxes, currentMailbox } = storeToRefs(mailboxesStore)
const { setCurrentMailbox } = mailboxesStore
const { loadMailboxes } = useLoadMailboxes()
const { loadMails } = useLoadMails()
const { setCurrentMail } = useMailsStore()
const { isLoading } = useLoadAccounts()

const onSelectAccount = async (account: MailAccount) => {
  setCurrentAccount(account)
  setCurrentMail(null)
  await loadMailboxes(unref(currentAccount).accountId)
  setCurrentMailbox(unref(mailboxes)[0])
  await loadMails(unref(currentAccount).accountId, unref(currentMailbox).id)
}
</script>
