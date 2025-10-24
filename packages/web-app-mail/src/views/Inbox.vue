<template>
  <app-loading-spinner v-if="isMailSummaryLoading" />
  <template v-else>
    <div class="flex h-full">
      <div
        :class="[
          'border-r-0 md:border-r-2 md:pr-2 overflow-y-auto min-w-0',
          selectedMail ? 'hidden md:block' : 'block',
          'w-full md:w-1/4'
        ]"
      >
        <div class="flex justify-between items-center">
          <h1 v-text="$gettext('Mailboxes')" />
        </div>
        <MailboxTree @select="onSelectMailbox" />
      </div>

      <div
        :class="[
          'border-r-0 md:border-r-2 md:pr-2 overflow-y-auto min-w-0',
          selectedMail ? 'hidden md:block' : 'block',
          'w-full md:w-1/4'
        ]"
      >
        <div class="flex justify-between ml-2 items-center">
          <h1 v-text="selectedMailboxName" />
        </div>
        <oc-list>
          <no-content-message v-if="!mails.length" icon="mail-forbid" icon-fill-type="line">
            <template #message>
              <span v-text="$gettext('No mails in this mailbox')" />
            </template>
          </no-content-message>
          <li
            v-for="mail in mails"
            v-else
            :key="mail.id"
            class="border-b-2"
            :class="{ 'bg-role-secondary-container': selectedMailId === mail.id }"
          >
            <oc-button
              class="px-2 py-4 text-left w-full"
              justify-content="left"
              appearance="raw"
              gap-size="none"
              no-hover
              @click="selectedMailId = mail.id"
            >
              <MailListItem :mail="mail" />
            </oc-button>
          </li>
        </oc-list>
      </div>
      <div
        :class="[
          'overflow-y-auto px-4 min-w-0',
          selectedMail ? 'block' : 'hidden md:block',
          'w-full md:w-3/4'
        ]"
      >
        <no-content-message v-if="!selectedMail" icon="mail" icon-fill-type="line">
          <template #message>
            <span v-text="$gettext('No mail selected')" />
          </template>
        </no-content-message>
        <MailDetails
          v-else
          class="md:ml-2 md:p-2"
          :account-id="selectedMail.accountId || selectedAccountId"
          :mail-id="selectedMail.id"
          @back="selectedMailId = null"
        />
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { z } from 'zod'
import { urlJoin } from '@opencloud-eu/web-client'
import { NoContentMessage, useClientService, useConfigStore } from '@opencloud-eu/web-pkg'
import { ref, computed, onMounted, unref, watch } from 'vue'
import { useTask } from 'vue-concurrency'
import MailListItem from '../components/MailListItem.vue'
import MailDetails from '../components/MailDetails.vue'
import MailboxTree from '../components/MailboxTree.vue'
import { Mail, MailSchema } from '../types'
import { AppLoadingSpinner } from '@opencloud-eu/web-pkg/src'
import { useRouteQuery } from '@opencloud-eu/web-pkg'

const configStore = useConfigStore()
const clientService = useClientService()

const selectedMailId = useRouteQuery('mailId')
const selectedAccountId = useRouteQuery('accountId')
const selectedMailboxId = useRouteQuery('mailboxId')
const selectedMailboxName = useRouteQuery('mailboxName')

const mail = ref<Mail>(null)
const mails = ref<Mail[]>([])

const selectedMail = computed(() => {
  return unref(mails).find((m) => m.id === unref(selectedMailId))
})

const isMailSummaryLoading = computed(
  () => loadMailSummaryTask.isRunning && !loadMailSummaryTask.last
)

const groupwareBaseUrl = computed(() => configStore.groupwareUrl)

const loadMailSummaryTask = useTask(function* (signal) {
  try {
    let endpoint = urlJoin(
      unref(groupwareBaseUrl),
      'accounts/all/emails/latest/summary?limit=50&seen=true'
    )
    if (unref(selectedAccountId) && unref(selectedMailboxId)) {
      endpoint = urlJoin(
        unref(groupwareBaseUrl),
        `accounts/${unref(selectedAccountId)}/mailboxes/${unref(selectedMailboxId)}/emails`
        // we need to add summary?limit=50&seen=true if it get available in the future
      )
    }

    const { data } = yield clientService.httpAuthenticated.get(endpoint, {
      signal
    })
    console.log('loadMailSummaryTask (data):', data)
    mails.value = z.array(MailSchema).parse(data.emails || [])
  } catch (e) {
    console.error(e)
  }
})

const onSelectMailbox = (payload: {
  accountId: string
  mailboxId: string
  mailboxName: string
}) => {
  selectedAccountId.value = payload.accountId
  selectedMailboxId.value = payload.mailboxId
  selectedMailboxName.value = payload.mailboxName
  selectedMailId.value = null
}

watch(
  [selectedAccountId, selectedMailboxId],
  () => {
    loadMailSummaryTask.perform()
  },
  { immediate: true }
)
</script>
