<template>
  <app-loading-spinner v-if="isLoading" />
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
            @click="loadMailDetails(mail)"
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
      <app-loading-spinner v-else-if="isMailDetailsLoading" />
      <MailDetails v-else-if="selectedMailDetails" :mail="selectedMailDetails" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { z } from 'zod'
import { urlJoin } from '@opencloud-eu/web-client'
import { NoContentMessage, useClientService, useConfigStore } from '@opencloud-eu/web-pkg'
import { ref, computed, onMounted, unref } from 'vue'
import { useTask } from 'vue-concurrency'
import MailListItem from '../components/MailListItem.vue'
import MailDetails from '../components/MailDetails.vue'
import { Mail, MailSchema } from '../types'
import { AppLoadingSpinner } from '@opencloud-eu/web-pkg/src'

const configStore = useConfigStore()
const clientService = useClientService()

const mails = ref<Mail[]>([])
const selectedMail = ref<Mail>(null)
const selectedMailDetails = ref<Mail>(null)
const isLoading = computed(() => loadAllMailsTask.isRunning && !loadAllMailsTask.last)
const isMailDetailsLoading = computed(
  () => loadMailDetailsTask.isRunning && !loadMailDetailsTask.last
)
//loadAllEmailsTask
const loadAllMailsTask = useTask(function* (signal) {
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

const loadMailDetailsTask = useTask(function* (signal) {
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
    selectedMailDetails.value = MailSchema.parse(data)
  } catch (e) {
    console.error(e)
  }
})

const loadMailDetails = (mail: Mail) => {
  selectedMail.value = mail
  loadMailDetailsTask.perform()
}

onMounted(() => {
  loadAllMailsTask.perform()
})
</script>
