<template>
  <div class="mail-details ml-2 p-2">
    <div class="mail-details-subject font-bold mt-1">
      <h1 class="block truncate" v-text="mail.subject" />
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
  </div>
</template>

<script setup lang="ts">
import { Mail } from '../types'
import { computed } from 'vue'
import { formatRelativeDateFromISO } from '@opencloud-eu/web-pkg/src'
import { useGettext } from 'vue3-gettext'

const { mail } = defineProps<{
  mail: Mail
}>()

const { current: currentLanguage } = useGettext()

const fromText = computed(() => {
  return mail.from[0]?.name || mail.sender[0]?.name || mail.from[0]?.email || mail.sender[0]?.email
})

const fromEmail = computed(() => {
  return mail.from[0]?.email || mail.sender[0]?.email
})

const fromName = computed(() => {
  return mail.from[0]?.name || mail.sender[0]?.name
})

const sendToNames = computed(() => {
  return mail.to.map((t) => t.name || t.email).join(', ')
})

const mailBody = computed(() => {
  // partyId from htmlBody to get Id for bodyValues

  return mail.bodyValues[0].value
})

const receivedAtRelativeDate = computed(() => {
  return formatRelativeDateFromISO(mail.receivedAt, currentLanguage)
})
</script>
