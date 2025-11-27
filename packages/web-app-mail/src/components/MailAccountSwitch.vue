<template>
  <oc-button
    id="account-list-toggle"
    class="w-full"
    appearance="filled"
    color-role="surface"
    justify-content="space-between"
    no-hover
  >
    <app-loading-spinner v-if="isLoading" />
    <div v-else class="flex justify-between items-center w-full">
      <div class="flex items-center truncate">
        <oc-avatar :user-name="currentAccount.name" />
        <div class="flex flex-col items-start ml-5 truncate">
          <span class="font-bold" v-text="currentAccount.name" />
          <span v-text="currentAccount.identities[0].email" />
        </div>
      </div>
      <oc-icon class="ml-2" name="more-2" />
    </div>
  </oc-button>
  <oc-drop :title="$gettext('Accounts')" class="w-md" toggle="#account-list-toggle" close-on-click>
    <oc-list>
      <li v-for="account in accounts" :key="account.accountId" class="oc-list">
        <oc-button
          class="p-2"
          :appearance="account.accountId === currentAccount.accountId ? 'filled' : 'raw-inverse'"
          :color-role="
            account.accountId === currentAccount.accountId ? 'secondaryContainer' : 'surface'
          "
          @click="onSelectAccount(account)"
        >
          <div class="flex justify-between items-center w-full">
            <div class="flex items-center truncate">
              <oc-avatar :user-name="account.name" />
              <div class="flex flex-col items-start ml-5 truncate">
                <span class="font-bold" v-text="account.name" />
                <span v-text="account.identities[0].email" />
              </div>
            </div>
            <oc-icon v-if="account.accountId === currentAccount.accountId" class="ml-2" name="check" />
          </div>
        </oc-button>
      </li>
    </oc-list>
  </oc-drop>
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
