<template>
  <app-loading-spinner v-if="isLoading" />
  <template v-else>
    <div class="flex h-full">
      <div
        class="w-full md:w-1/4 flex flex-row"
        :class="{
          'hidden md:flex': currentMailbox
        }"
      >
        <div class="overflow-y-auto md:border-r-2 bg-role-surface-container w-full">
          <MailboxTree @compose-mail="onComposeMail" />
        </div>
      </div>
      <div
        class="md:border-r-2 overflow-y-auto min-w-0 w-full md:w-1/4 px-4 md:px-0"
        :class="{
          'hidden md:block': currentMail || !currentMailbox
        }"
      >
        <MailList ref="mailListRef" />
      </div>
      <div
        class="overflow-y-auto min-w-0 w-full md:w-2/4 px-4 pt-4 md:pt-0"
        :class="{
          'hidden md:block': !currentMail
        }"
      >
        <MailDetails :key="currentMail?.id" />
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { ref, unref, onMounted, ComponentPublicInstance, useTemplateRef } from 'vue'
import MailList from '../components/MailList.vue'
import MailDetails from '../components/MailDetails.vue'
import MailboxTree from '../components/MailboxTree.vue'
import { AppLoadingSpinner, queryItemAsString } from '@opencloud-eu/web-pkg'
import { useRouteQuery } from '@opencloud-eu/web-pkg'
import { useMailsStore } from '../composables/piniaStores/mails'
import { useAccountsStore } from '../composables/piniaStores/accounts'
import { storeToRefs } from 'pinia'
import { useMailboxesStore } from '../composables/piniaStores/mailboxes'
import { useLoadAccounts } from '../composables/useLoadAccounts'
import { useLoadMailboxes } from '../composables/useLoadMailboxes'
import { useLoadMails } from '../composables/useLoadMails'
import { useLoadMail } from '../composables/useLoadMail'

const accountsStore = useAccountsStore()
const mailboxesStore = useMailboxesStore()
const mailsStore = useMailsStore()

const { accounts, currentAccount } = storeToRefs(accountsStore)
const { setCurrentAccount } = accountsStore
const { mailboxes, currentMailbox } = storeToRefs(mailboxesStore)
const { setCurrentMailbox } = mailboxesStore
const { currentMail } = storeToRefs(mailsStore)

const { loadAccounts } = useLoadAccounts()
const { loadMailboxes } = useLoadMailboxes()
const { loadMails } = useLoadMails()
const { loadMail } = useLoadMail()

const isLoading = ref<boolean>(true)
const mailListRef = useTemplateRef<ComponentPublicInstance<typeof MailList>>('mailListRef')

const currentAccountIdQuery = useRouteQuery('accountId')
const currentMailboxIdQuery = useRouteQuery('mailboxId')
const currentMailIdQuery = useRouteQuery('mailId')

const onComposeMail = () => {
  console.log('Compose geklickt')
  mailListRef.value?.openCompose()
}

onMounted(async () => {
  await loadAccounts()

  const selectedAccountId = unref(currentAccountIdQuery)
  const account = selectedAccountId
    ? (unref(accounts).find((a) => a.accountId === selectedAccountId) ??
      unref(accounts)?.[0] ??
      null)
    : (unref(accounts)?.[0] ?? null)

  if (!account) {
    isLoading.value = false
    return
  }

  setCurrentAccount(account)

  await loadMailboxes(unref(account).accountId)

  const selectedMailboxId = unref(currentMailboxIdQuery)
  const mailbox = selectedMailboxId
    ? (unref(mailboxes).find((m) => m.id === selectedMailboxId) ?? unref(mailboxes)?.[0] ?? null)
    : (unref(mailboxes)?.[0] ?? null)

  if (!mailbox) {
    isLoading.value = false
    return
  }

  setCurrentMailbox(mailbox)

  await loadMails(unref(account).accountId, unref(mailbox).id)

  if (unref(currentMailIdQuery)) {
    await loadMail(unref(account).accountId, queryItemAsString(unref(currentMailIdQuery)))
  }

  isLoading.value = false
})
</script>
