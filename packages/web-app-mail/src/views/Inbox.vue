<template>
  <app-loading-spinner v-if="isMailSummaryLoading" />
  <div v-else class="flex">
    <div class="w-1/4 border-r-2 pr-2">
      <h1 v-text="$gettext('All emails')" />
      <oc-list>
        <no-content-message v-if="!mails.length" icon="mail-forbid" icon-fill-type="line">
          <template #message>
            <span v-text="$gettext('No mails in this inbox')" />
          </template>
        </no-content-message>
        <li v-for="mail in mails" v-else :key="mail.id" class="px-2 py-4 border-b-2">
          <MailListItem
            :from="mail.from"
            :preview="mail.preview"
            :received-at="mail.receivedAt"
            :sender="mail.sender"
            :subject="mail.subject"
            :is-unread="!mail.keywords?.['$seen']"
            @click="selectedMail = mail"
          />
        </li>
      </oc-list>
    </div>
    <div class="w-3/4">
      <no-content-message v-if="!selectedMail" icon="mail" icon-fill-type="line">
        <template #message>
          <span v-text="$gettext('No mail selected')" />
        </template>
      </no-content-message>
      <app-loading-spinner v-else-if="isMailLoading" />
      <MailDetails v-else-if="mail" :mail="mail" />
    </div>
  </div>
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

const configStore = useConfigStore()
const clientService = useClientService()

const mail = ref<Mail>(null)
const selectedMail = ref<Mail>(null)
const mails = ref<Mail[]>([])

const isMailSummaryLoading = computed(
  () => loadMailSummaryTask.isRunning && !loadMailSummaryTask.last
)
const isMailLoading = computed(() => loadMailDetailsTask.isRunning && !loadMailDetailsTask.last)

const loadMailSummaryTask = useTask(function* (signal) {
  try {
    const { data } = yield clientService.httpAuthenticated.get(
      // we need to change this to /all if it is available
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
  selectedMail,
  () => {
    loadMailTask.perform()
  },
  { deep: true }
)

onMounted(() => {
  loadMailSummaryTask.perform()
})
</script>
