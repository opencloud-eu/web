<template>
  <app-loading-spinner v-if="isLoading" />
  <template v-else>
    <div class="flex h-full">
      <div
        class="md:border-r-2 overflow-y-auto min-w-0 w-full md:w-1/4 px-4 md:px-0"
        :class="{
          'hidden md:block': currentMail || !currentMailbox
        }"
      >
        <MailList ref="mailListRef" />
      </div>
      <div
        class="overflow-y-auto min-w-0 w-full md:w-3/4 px-4 pt-4 md:pt-0"
        :class="{
          'hidden md:block': !currentMail
        }"
      >
        <MailDetails :key="currentMail?.id" />
      </div>
    </div>
    <MailWidget v-if="showCompose" @close="onCloseCompose" />
  </template>
</template>

<script setup lang="ts">
import { ref, unref, onMounted, onUnmounted } from 'vue'
import MailList from '../components/MailList.vue'
import MailDetails from '../components/MailDetails.vue'
import MailWidget from '../components/MailWidget.vue'
import { AppLoadingSpinner, queryItemAsString, useEventBus } from '@opencloud-eu/web-pkg'
import { useRouteQuery } from '@opencloud-eu/web-pkg'
import { useMailsStore } from '../composables/piniaStores/mails'
import { useGroupwareAccountsStore, useLoadAccounts } from '@opencloud-eu/web-pkg'
import { storeToRefs } from 'pinia'
import { useMailboxesStore } from '../composables/piniaStores/mailboxes'
import { useLoadMailboxes } from '../composables/useLoadMailboxes'
import { useLoadMails } from '../composables/useLoadMails'
import { useLoadMail } from '../composables/useLoadMail'

const accountsStore = useGroupwareAccountsStore()
const mailboxesStore = useMailboxesStore()
const mailsStore = useMailsStore()
const eventBus = useEventBus()

const { accounts, currentAccount } = storeToRefs(accountsStore)
const { setCurrentAccount } = accountsStore
const { mailboxes, currentMailbox } = storeToRefs(mailboxesStore)
const { setCurrentMailbox } = mailboxesStore
const { currentMail } = storeToRefs(mailsStore)

const { loadAccounts } = useLoadAccounts()
const { loadMailboxes } = useLoadMailboxes()
const { loadMails } = useLoadMails()
const { loadMail } = useLoadMail()
const { setCurrentMail } = mailsStore

const isLoading = ref<boolean>(true)

const currentAccountIdQuery = useRouteQuery('accountId')
const currentMailboxIdQuery = useRouteQuery('mailboxId')
const currentMailIdQuery = useRouteQuery('mailId')

let mailComposeEventToken: string
const showCompose = ref(false)

const onComposeMail = () => {
  showCompose.value = true
}

const onCloseCompose = () => {
  showCompose.value = false
}

accountsStore.$onAction(async ({ name }) => {
  if (name === 'setCurrentAccount' && unref(currentAccount)) {
    setCurrentMail(null)
    await loadMailboxes(unref(currentAccount).accountId)
    setCurrentMailbox(unref(mailboxes)[0])
    await loadMails(unref(currentAccount).accountId, unref(currentMailbox).id)
  }
})

onMounted(async () => {
  mailComposeEventToken = eventBus.subscribe('app.mail.show-compose-mail', onComposeMail)
  await loadAccounts()
  if (unref(currentAccountIdQuery)) {
    setCurrentAccount(
      unref(accounts).find((account) => account.accountId === unref(currentAccountIdQuery))
    )
  } else {
    setCurrentAccount(unref(accounts)?.[0])
  }

  console.log(unref(currentAccount))

  await loadMailboxes(unref(currentAccount).accountId)
  if (unref(currentMailboxIdQuery)) {
    setCurrentMailbox(
      unref(mailboxes).find((mailbox) => mailbox.id === unref(currentMailboxIdQuery))
    )
  } else {
    setCurrentMailbox(unref(mailboxes)?.[0])
  }

  await loadMails(unref(currentAccount).accountId, unref(currentMailbox).id)

  if (unref(currentMailIdQuery)) {
    await loadMail(unref(currentAccount).accountId, queryItemAsString(unref(currentMailIdQuery)))
  }

  isLoading.value = false
})

onUnmounted(() => {
  eventBus.unsubscribe('app.mail.show-compose-mail', mailComposeEventToken)
})
</script>
