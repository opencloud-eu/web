<template>
  <app-loading-spinner v-if="isMailSummaryLoading" />
  <template v-else>
    <div class="flex h-full">
      <div
        :class="[
          'border-r-0 md:border-r-2 md:pr-2 overflow-y-auto ',
          selectedMail ? 'hidden md:block' : 'block',
          'w-full md:w-1/4'
        ]"
      >
        <h1 v-text="$gettext('All emails')" />
        <oc-list>
          <no-content-message v-if="!mails.length" icon="mail-forbid" icon-fill-type="line">
            <template #message>
              <span v-text="$gettext('No mails in this inbox')" />
            </template>
          </no-content-message>
          <li v-for="mail in mails" v-else :key="mail.id" class="border-b-2">
            <oc-button
              class="px-2 py-4 text-left w-full"
              justify-content="left"
              appearance="raw"
              gap-size="none"
              @click="selectedMailId = mail.id"
            >
              <MailListItem
                :from="mail.from"
                :preview="mail.preview"
                :received-at="mail.receivedAt"
                :sender="mail.sender"
                :subject="mail.subject"
                :is-unread="!mail.keywords?.['$seen']"
              />
            </oc-button>
          </li>
        </oc-list>
      </div>
      <div
        :class="[
          'overflow-y-auto px-4',
          selectedMail ? 'block' : 'hidden md:block',
          'w-full md:w-3/4'
        ]"
      >
        <no-content-message v-if="!selectedMail" icon="mail" icon-fill-type="line">
          <template #message>
            <span v-text="$gettext('No mail selected')" />
          </template>
        </no-content-message>
        <app-loading-spinner v-else-if="isMailLoading" />
        <MailDetails v-else-if="mail" :mail="mail" @back="selectedMailId = null" />
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
import { Mail, MailSchema } from '../types'
import { AppLoadingSpinner } from '@opencloud-eu/web-pkg/src'
import { useRouteQuery } from '@opencloud-eu/web-pkg'

const configStore = useConfigStore()
const clientService = useClientService()
const selectedMailId = useRouteQuery('mailId')

const mail = ref<Mail>(null)
const mails = ref<Mail[]>([])

const selectedMail = computed(() => {
  return unref(mails).find((m) => m.id === unref(selectedMailId))
})

const isMailSummaryLoading = computed(
  () => loadMailSummaryTask.isRunning && !loadMailSummaryTask.last
)
const isMailLoading = computed(() => loadMailTask.isRunning && !loadMailTask.last)

const loadMailSummaryTask = useTask(function* (signal) {
  try {
    const { data } = yield clientService.httpAuthenticated.get(
      urlJoin(configStore.groupwareUrl, 'accounts/all/emails/latest/summary?limit=50&seen=true'),
      {
        signal
      }
    )
    console.log(data)
    mails.value = z.array(MailSchema).parse(data)
  } catch (e) {
    console.error(e)
  }
})

const loadMailTask = useTask(function* (signal) {
  try {
    const { data } = yield clientService.httpAuthenticated.get(
      urlJoin(
        configStore.groupwareUrl,
        `accounts/${unref(selectedMail).accountId}/emails/${unref(selectedMail).id}`
      ),
      {
        signal
      }
    )
    console.log(data)
    mail.value = MailSchema.parse(data)
  } catch (e) {
    console.error(e)
  }
})

watch(
  [selectedMailId, mails],
  () => {
    if (!unref(selectedMailId)) {
      return
    }
    loadMailTask.perform()
  },
  { immediate: true }
)

onMounted(() => {
  loadMailSummaryTask.perform()
})
</script>
