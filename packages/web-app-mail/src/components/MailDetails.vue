<template>
  <app-loading-spinner v-if="isLoading" />
  <div v-else-if="mail" class="mail-details">
    <oc-button class="md:hidden mb-2" appearance="raw" no-hover @click="$emit('back')">
      <oc-icon name="arrow-left" fill-type="line" />
    </oc-button>
    <div class="mail-details-subject font-bold flex justify-between items-center mt-1">
      <h3 class="text-lg block truncate" v-text="mail.subject" />
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
      class="mail-details-attachments my-6"
      :attachments="mail.attachments"
      :account-id="mail.accountId"
    />
  </div>
</template>

<script setup lang="ts">
import type { Mail } from '../types'
import { computed, unref } from 'vue'
import { formatRelativeDateFromISO } from '@opencloud-eu/web-pkg/src'
import { useGettext } from 'vue3-gettext'
import { buildMailBody } from '../helpers'
import MailAttachmentList from './MailAttachmentList.vue'
import MailIndicators from './MailIndicators.vue'
import { AppLoadingSpinner } from '@opencloud-eu/web-pkg/src'

const { mail, isLoading = false } = defineProps<{
  mail?: Mail
  isLoading?: boolean
}>()

defineEmits<{
  (e: 'back'): void
}>()

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
</script>
