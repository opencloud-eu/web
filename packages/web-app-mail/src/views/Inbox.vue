<template>
  <app-loading-spinner v-if="isLoading" />
  <div v-else>
    <oc-list>
      <no-content-message v-if="!mails.length" icon="mail-forbid">
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
        />
      </li>
    </oc-list>
  </div>
</template>

<script setup lang="ts">
import { z } from 'zod'
import { urlJoin } from '@opencloud-eu/web-client'
import { NoContentMessage, useClientService, useConfigStore } from '@opencloud-eu/web-pkg'
import { ref, computed, onMounted } from 'vue'
import { useTask } from 'vue-concurrency'
import MailListItem from '../components/MailListItem.vue'
import { Mail, MailSchema } from '../types'
import { AppLoadingSpinner } from '@opencloud-eu/web-pkg/src'

const configStore = useConfigStore()
const clientService = useClientService()

const mails = ref<Mail[]>([])
const isLoading = computed(() => loadAllMailsTask.isRunning && !loadAllMailsTask.last)

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

onMounted(() => {
  loadAllMailsTask.perform()
})
</script>
