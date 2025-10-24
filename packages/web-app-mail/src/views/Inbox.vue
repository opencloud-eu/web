<template>
  <app-loading-spinner v-if="isMailSummaryLoading" />
  <template v-else>
    <div class="flex h-full">
      <div
        :class="[
          'border-r-0 md:border-r-2 overflow-y-auto min-w-0 bg-role-surface-container',
          selectedMail ? 'hidden md:block' : 'block',
          'w-full md:w-1/4'
        ]"
      >
        <MailboxTree class="" :selected-mailbox="mailbox" @select="onSelectMailbox" />
      </div>

      <div
        :class="[
          'border-r-0 md:border-r-2 overflow-y-auto min-w-0',
          selectedMail ? 'hidden md:block' : 'block',
          'w-full md:w-1/4'
        ]"
      >
        <MailList
          :mails="mails"
          :mailbox="mailbox"
          :selected-mail="selectedMail"
          @select-mail="selectedMailId = $event"
        />
      </div>
      <div
        :class="[
          'overflow-y-auto px-4 min-w-0',
          selectedMail ? 'block' : 'hidden md:block',
          'w-full md:w-2/4'
        ]"
      >
        <no-content-message v-if="!selectedMail" icon="mail" icon-fill-type="line">
          <template #message>
            <span v-text="$gettext('No mail selected')" />
          </template>
        </no-content-message>
        <MailDetails
          v-else
          class="md:px-2"
          :account-id="selectedAccountId"
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
import { ref, computed, unref, watch } from 'vue'
import { useTask } from 'vue-concurrency'
import MailList from '../components/MailList.vue'
import MailDetails from '../components/MailDetails.vue'
import MailboxTree from '../components/MailboxTree.vue'
import { Mail, Mailbox, MailSchema } from '../types'
import { AppLoadingSpinner } from '@opencloud-eu/web-pkg/src'
import { useRouteQuery } from '@opencloud-eu/web-pkg'

const configStore = useConfigStore()
const clientService = useClientService()

const selectedMailId = useRouteQuery('mailId')
const selectedAccountId = useRouteQuery('accountId', 'b')
const selectedMailboxId = useRouteQuery('mailboxId')

const mails = ref<Mail[]>([])
const mailbox = ref<Mailbox>(null)

const selectedMail = computed(() => {
  return unref(mails).find((m) => m.id === unref(selectedMailId))
})

const isMailSummaryLoading = computed(
  () => loadMailSummaryTask.isRunning && !loadMailSummaryTask.last
)

const groupwareBaseUrl = computed(() => configStore.groupwareUrl)

const loadMailSummaryTask = useTask(function* (signal) {
  try {
    const { data } = yield clientService.httpAuthenticated.get(
      urlJoin(
        unref(groupwareBaseUrl),
        `accounts/b/mailboxes/${unref(mailbox).id}/emails`
        // we need to add summary?limit=50&seen=true if it get available in the future
      ),
      {
        signal
      }
    )
    console.log('loadMailSummaryTask (data):', data)
    mails.value = z.array(MailSchema).parse(data.emails || [])
  } catch (e) {
    console.error(e)
  }
})

const onSelectMailbox = (selectedMailbox: Mailbox) => {
  mailbox.value = selectedMailbox
  selectedMailboxId.value = unref(mailbox).id
  selectedMailId.value = null
}

watch(
  mailbox,
  () => {
    loadMailSummaryTask.perform()
  },
  { immediate: true }
)
</script>
