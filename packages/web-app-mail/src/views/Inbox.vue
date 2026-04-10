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
        <MailList />
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
    <MailWidget v-if="showCompose" :draft-mail="draftMail" @close="closeCompose" />
  </template>
</template>

<script setup lang="ts">
import { ref, unref, onMounted } from 'vue'
import MailList from '../components/MailList.vue'
import MailDetails from '../components/MailDetails.vue'
import MailWidget from '../components/MailWidget.vue'
import { AppLoadingSpinner, queryItemAsString, useClientService } from '@opencloud-eu/web-pkg'
import { useRouteQuery } from '@opencloud-eu/web-pkg'
import { useMailsStore } from '../composables/piniaStores/mails'
import { useGroupwareAccountsStore } from '@opencloud-eu/web-pkg'
import { storeToRefs } from 'pinia'
import { useMailboxesStore } from '../composables/piniaStores/mailboxes'
import { useLoadMailboxes } from '../composables/useLoadMailboxes'
import { useLoadMails } from '../composables/useLoadMails'
import { useLoadMail } from '../composables/useLoadMail'
import { useMailCompose } from '../composables/useMailCompose'
import { Mailbox } from '../types'

const accountsStore = useGroupwareAccountsStore()
const mailboxesStore = useMailboxesStore()
const mailsStore = useMailsStore()
const { httpAuthenticated } = useClientService()

const { currentAccount } = storeToRefs(accountsStore)
const { loadCurrentAccount } = accountsStore
const { mailboxes, currentMailbox } = storeToRefs(mailboxesStore)
const { setCurrentMailbox } = mailboxesStore
const { currentMail } = storeToRefs(mailsStore)

const { loadMailboxes } = useLoadMailboxes()
const { loadMails } = useLoadMails()
const { loadMail } = useLoadMail()
const { setCurrentMail } = mailsStore

const { isOpen: showCompose, draftMail, closeCompose } = useMailCompose()

const isLoading = ref<boolean>(true)

const currentAccountIdQuery = useRouteQuery('accountId')
const currentMailboxIdQuery = useRouteQuery('mailboxId')
const currentMailIdQuery = useRouteQuery('mailId')

const loadMailboxesAndMails = async () => {
  isLoading.value = true

  // load mailboxes
  await loadMailboxes(unref(currentAccount).accountId)
  let queryMailbox: Mailbox | undefined
  if (unref(currentMailboxIdQuery)) {
    queryMailbox = unref(mailboxes).find(({ id }) => id === unref(currentMailboxIdQuery))
  }
  setCurrentMailbox(queryMailbox || unref(mailboxes)?.[0])

  // load mails
  await loadMails(unref(currentAccount).accountId, unref(currentMailbox).id)
  if (unref(currentMailIdQuery)) {
    await loadMail(unref(currentAccount).accountId, queryItemAsString(unref(currentMailIdQuery)))
  }

  isLoading.value = false
}

accountsStore.$onAction(({ after, name }) => {
  after(() => {
    // load mailboxes and mails when the current account is set
    if (['loadCurrentAccount', 'setCurrentAccount'].includes(name) && unref(currentAccount)) {
      currentAccountIdQuery.value = unref(currentAccount).accountId
      loadMailboxesAndMails()
    }
  })
})

onMounted(() => {
  loadCurrentAccount({
    client: httpAuthenticated,
    query: queryItemAsString(unref(currentAccountIdQuery))
  })
})
</script>
