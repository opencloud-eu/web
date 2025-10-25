<template>
  <app-loading-spinner v-if="isLoading" />
  <template v-else>
    <div class="flex h-full">
      <div
        class="w-full md:w-1/4 flex flex-row flex"
        :class="{
          'hidden md:flex': mailbox
        }"
      >
        <div
          class="border-r-2 overflow-y-auto min-w-0 bg-role-surface-container basis-1/4 shrink-0"
        >
          <MailAccountList
            :accounts="accounts"
            :selected-account="account"
            :is-loading="isAccountsLoading"
            @select="onSelectAccount"
          />
        </div>

        <div class="overflow-y-auto md:border-r-2 min-w-0 bg-role-surface-container basis-3/4">
          <MailboxTree
            :account="account"
            :mailboxes="mailboxes"
            :is-loading="isMailboxesLoading"
            :selected-mailbox="mailbox"
            @select="onSelectMailbox"
          />
        </div>
      </div>
      <div
        class="md:border-r-2 overflow-y-auto min-w-0 w-full md:w-1/4"
        :class="{
          'hidden md:block': selectedMail || !mailbox
        }"
      >
        <MailList
          :mails="mails"
          :mailbox="mailbox"
          :selected-mail="selectedMail"
          :is-loading="isMailsLoading"
          @select-mail="onSelectMail"
          @back="onDeselectMailbox"
        />
      </div>
      <div
        class="overflow-y-auto px-4 min-w-0 w-full md:w-2/4"
        :class="{
          'hidden md:block': !mailDetails
        }"
      >
        <MailDetails
          class="px-2 pt-4 md:pt-0"
          :mail="mailDetails"
          :is-loading="isMailLoading"
          @back="onDeselectMail"
        />
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { z } from 'zod'
import { urlJoin } from '@opencloud-eu/web-client'
import { useClientService, useConfigStore } from '@opencloud-eu/web-pkg'
import { ref, computed, unref, onMounted } from 'vue'
import { useTask } from 'vue-concurrency'
import MailList from '../components/MailList.vue'
import MailDetails from '../components/MailDetails.vue'
import MailboxTree from '../components/MailboxTree.vue'
import { Mail, MailAccount, Mailbox, MailSchema, MailAccountSchema, MailboxSchema } from '../types'
import { AppLoadingSpinner } from '@opencloud-eu/web-pkg/src'
import { useRouteQuery } from '@opencloud-eu/web-pkg'
import MailAccountList from '../components/MailAccountList.vue'

const configStore = useConfigStore()
const clientService = useClientService()

const accounts = ref<MailAccount[]>([])
const account = ref<MailAccount>(null)
const mailboxes = ref<Mailbox[]>([])
const mailbox = ref<Mailbox>(null)
const mails = ref<Mail[]>([])
const mailDetails = ref<Mail>(null)
const isLoading = ref<boolean>(true)

const selectedMailIdQuery = useRouteQuery('mailId')
const selectedAccountIdQuery = useRouteQuery('accountId')
const selectedMailboxIdQuery = useRouteQuery('mailboxId')

const selectedMail = computed(() => {
  return unref(mails).find((m) => m.id === unref(selectedMailIdQuery))
})

const loadAccountsTask = useTask(function* (signal) {
  try {
    const { data } = yield clientService.httpAuthenticated.get(
      urlJoin(unref(configStore.groupwareUrl), `accounts`)
    )
    accounts.value = z.array(MailAccountSchema).parse(data)
  } catch (e) {
    console.error(e)
  }
})

const loadMailboxesTask = useTask(function* (signal) {
  try {
    const { data } = yield clientService.httpAuthenticated.get(
      urlJoin(unref(configStore.groupwareUrl), `accounts/${unref(account).accountId}/mailboxes`)
    )
    mailboxes.value = z.array(MailboxSchema).parse(data)
  } catch (e) {
    console.error(e)
  }
})

const loadMailSummaryTask = useTask(function* (signal) {
  try {
    const { data } = yield clientService.httpAuthenticated.get(
      urlJoin(
        unref(configStore.groupwareUrl),
        `accounts/${unref(account).accountId}/mailboxes/${unref(mailbox).id}/emails`
      )
    )
    mails.value = z.array(MailSchema).parse(data.emails || [])
  } catch (e) {
    console.error(e)
  }
})

const loadMailTask = useTask(function* (signal, mailId) {
  try {
    const { data } = yield clientService.httpAuthenticated.get(
      urlJoin(
        unref(configStore.groupwareUrl),
        `accounts/${unref(account).accountId}/emails/${mailId}?markAsSeen=true`
      )
    )
    mailDetails.value = MailSchema.parse(data)
  } catch (e) {
    console.error(e)
  }
})

const isAccountsLoading = computed(
  () => unref(loadAccountsTask.isRunning) || !unref(loadAccountsTask.last)
)
const isMailboxesLoading = computed(
  () => unref(loadMailboxesTask.isRunning) || !unref(loadMailboxesTask.last)
)

const isMailsLoading = computed(
  () => unref(loadMailSummaryTask.isRunning) || !unref(loadMailSummaryTask.last)
)

const isMailLoading = computed(() => unref(loadMailTask.isRunning))

const onSelectAccount = async (selectedAccount: MailAccount) => {
  account.value = selectedAccount
  selectedAccountIdQuery.value = selectedAccount.accountId

  selectedMailboxIdQuery.value = null
  selectedMailIdQuery.value = null

  await loadMailSummaryTask.perform()
  mailbox.value = unref(mailboxes)[0]

  await loadMailSummaryTask.perform()
}

const onSelectMailbox = async (selectedMailbox: Mailbox) => {
  mailbox.value = selectedMailbox
  selectedMailboxIdQuery.value = selectedMailbox.id
  selectedMailIdQuery.value = null
  mailDetails.value = null
  await loadMailSummaryTask.perform()
}

const onSelectMail = async (selectedMail: Mail) => {
  selectedMailIdQuery.value = selectedMail.id
  await loadMailTask.perform(selectedMail.id)
}

const onDeselectMail = () => {
  mailDetails.value = null
  selectedMailIdQuery.value = null
}

const onDeselectMailbox = () => {
  mailbox.value = null
  mails.value = null
  mailDetails.value = null
  selectedMailboxIdQuery.value = null
  selectedMailIdQuery.value = null
}

onMounted(async () => {
  await loadAccountsTask.perform()
  console.log('Accounts', unref(mailboxes))

  if (unref(selectedAccountIdQuery)) {
    account.value = unref(accounts).find(
      (account) => account.accountId === unref(selectedAccountIdQuery)
    )
  } else {
    account.value = unref(accounts)[0]
    selectedAccountIdQuery.value = unref(account).accountId
  }

  await loadMailboxesTask.perform()
  console.log('Mailboxes', unref(mailboxes))

  if (unref(selectedMailboxIdQuery)) {
    mailbox.value = unref(mailboxes).find((mailbox) => mailbox.id === unref(selectedMailboxIdQuery))
  } else {
    mailbox.value = unref(mailboxes)[0]
    selectedMailboxIdQuery.value = unref(mailbox).id
  }

  await loadMailSummaryTask.perform()
  console.log('Mails', unref(mailboxes))

  if (unref(selectedMailIdQuery)) {
    await loadMailTask.perform(unref(selectedMailIdQuery))
    console.log('Mail', unref(mailDetails))
  }

  isLoading.value = false
})
</script>
