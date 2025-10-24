<template>
  <app-loading-spinner v-if="isMailLoading" />
  <div v-else-if="mail" class="mail-details">
    <oc-button class="md:hidden mb-2" appearance="raw" no-hover @click="$emit('back')">
      <oc-icon name="arrow-left" fill-type="line" />
    </oc-button>
    <div class="mail-details-subject font-bold flex justify-between items-center mt-1">
      <h2 class="block truncate" v-text="mail.subject" />
      <MailIndicators :mail="mail" />
    </div>
    <div class="mail-details-subheader mt-2 flex justify-between">
      <oc-avatar :user-name="mail.from[0]?.name || mail.sender[0]?.name" />
      <div class="mail-details-userinfo flex-1 ml-4">
        <div class="font-bold text-xl truncate flex-1" v-text="fromName" />
        <div class="truncate" v-text="fromEmail" />
      </div>
      <span class="mail-details-received-at" v-text="receivedAtRelativeDate" />
    </div>
    <div class="mail-details-to mt-4">
      <span class="mr-4" v-text="$gettext('To:')" />
      <span class="truncate" v-text="sendToNames" />
    </div>
    <div class="mail-details-body mt-6" v-html="mailBody" />
    <MailAttachmentList
      v-if="mail.attachments.length"
      class="mail-details-attachments mt-6"
      :attachments="mail.attachments"
      :account-id="mail.accountId"
    />
  </div>
</template>

<script setup lang="ts">
import { Mail, MailSchema } from '../types'
import { computed, ref, unref, watch } from 'vue'
import {
  formatRelativeDateFromISO,
  useClientService,
  useConfigStore
} from '@opencloud-eu/web-pkg/src'
import { useGettext } from 'vue3-gettext'
import { buildMailBody } from '../helpers'
import MailAttachmentList from './MailAttachmentList.vue'
import MailIndicators from './MailIndicators.vue'
import { useTask } from 'vue-concurrency'
import { urlJoin } from '@opencloud-eu/web-client'

const { accountId, mailId } = defineProps<{
  accountId: string
  mailId: string
}>()

defineEmits<{
  (e: 'back'): void
}>()
const clientService = useClientService()
const configStore = useConfigStore()
const { current: currentLanguage } = useGettext()

const mail = ref<Mail>()

const groupwareBaseUrl = computed(() => configStore.groupwareUrl)

const fromEmail = computed(() => {
  return unref(mail).from[0]?.email || unref(mail).sender[0]?.email
})

const fromName = computed(() => {
  return unref(mail).from[0]?.name || unref(mail).sender[0]?.name
})

const sendToNames = computed(() => {
  return unref(mail)
    .to.map((t) => t.name || t.email)
    .join(', ')
})

const mailBody = computed(() => buildMailBody(unref(mail)))

const isMailLoading = computed(() => loadMailTask.isRunning && !loadMailTask.last)

const receivedAtRelativeDate = computed(() => {
  return formatRelativeDateFromISO(unref(mail).receivedAt, currentLanguage)
})

const loadMailTask = useTask(function* (signal) {
  try {
    const { data } = yield clientService.httpAuthenticated.get(
      urlJoin(unref(groupwareBaseUrl), `accounts/${accountId}/emails/${mailId}?markAsSeen=true`),
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
  [() => mailId, () => accountId],
  () => {
    if (!mailId || !accountId) {
      return
    }
    loadMailTask.perform()
  },
  {
    immediate: true
  }
)
</script>
