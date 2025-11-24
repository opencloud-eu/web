<template>
  <app-loading-spinner v-if="isLoading" />
  <template v-else>
    <no-content-message v-if="!mail" icon="mail" icon-fill-type="line">
      <template #message>
        <span v-text="$gettext('No mail selected')" />
      </template>
    </no-content-message>
    <div v-else class="mail-details">
      <oc-button
        class="md:hidden mb-2"
        appearance="raw"
        no-hover
        :aria-label="$gettext('Navigate back')"
        @click="$emit('back')"
      >
        <oc-icon name="arrow-left" fill-type="line" />
      </oc-button>
      <div class="mail-details-subject font-bold flex justify-between items-center mt-1">
        <h3 class="text-lg block truncate" v-text="mail.subject" />
        <MailIndicators :mail="mail" />
      </div>
      <div class="mail-details-subheader mt-2 flex min-w-0 justify-between">
        <div class="shrink-0">
          <oc-avatar :user-name="mail.from[0]?.name || mail.sender[0]?.name" />
        </div>
        <div class="mail-details-userinfo flex-1 min-w-0 ml-4">
          <div class="font-bold text-xl truncate flex-1" v-text="fromName" />
          <div class="truncate" v-text="fromEmail" />
        </div>
        <span class="mail-details-received-at shrink-0 ml-2" v-text="receivedAtRelativeDate" />
      </div>
      <div class="mail-details-to mt-4">
        <span class="mr-4" v-text="$gettext('To:')" />
        <span class="truncate" v-text="sendToNames" />
      </div>
      <mail-appointment-list
        v-if="appointments?.length"
        :account-id="account.accountId"
        :appointments="appointments"
      />
      <div class="mail-details-body mt-6" v-html="mailBody" />
      <MailAttachmentList
        v-if="mail.attachments.length"
        class="mail-details-attachments my-6"
        :attachments="mail.attachments"
        :account-id="account.accountId"
      />
    </div>
  </template>
</template>

<script setup lang="ts">
import type { Mail, MailAccount } from '../types'
import { computed, unref } from 'vue'
import { formatRelativeDateFromISO, NoContentMessage } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import { buildMailBody } from '../helpers'
import MailAttachmentList from './MailAttachmentList.vue'
import MailIndicators from './MailIndicators.vue'
import { AppLoadingSpinner } from '@opencloud-eu/web-pkg'
import MailAppointmentList from './MailAppointmentList.vue'
import { useLoadMail } from '../composables/useLoadMail'

const {
  account,
  mail = null
} = defineProps<{
  account: MailAccount
  mail?: Mail
}>()

defineEmits<{
  (e: 'back'): void
}>()

const { isLoading } = useLoadMail()

const { current: currentLanguage } = useGettext()

const fromEmail = computed(() => {
  return unref(mail)?.from[0]?.email || unref(mail)?.sender[0]?.email
})

const fromName = computed(() => {
  return unref(mail)?.from[0]?.name || unref(mail)?.sender[0]?.name
})

const sendToNames = computed(() => {
  const m = unref(mail)
  if (!m) return ''
  return m.to.map((t) => t.name || t.email).join(', ')
})

const mailBody = computed(() => (unref(mail) ? buildMailBody(unref(mail)) : ''))

const receivedAtRelativeDate = computed(() => {
  const m = unref(mail)
  if (!m?.receivedAt) return ''
  return formatRelativeDateFromISO(m.receivedAt, currentLanguage)
})

const appointments = computed(() => {
  return mail.attachments?.filter((attachment) => attachment.type === 'text/calendar')
})
</script>
