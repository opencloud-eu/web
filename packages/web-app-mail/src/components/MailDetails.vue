<template>
  <div class="mail-details p-2">
    <div class="mail-details-subject font-bold mt-1">
      <h1 class="block truncate" v-text="mail.subject" />
    </div>
    <div class="mail-details-subheader mt-2 flex items-center justify-between">
      <oc-avatar class="ml-1" :user-name="mail.from[0]?.name || mail.sender[0]?.name" />

      <div class="mail-details-userinfo flex-1 ml-4">
        <div class="font-bold text-xl truncate flex-1" v-text="fromName" />
        <div class="truncate" v-text="fromEmail" />
      </div>
      <span class="mail-details-received-at" v-text="receivedAtRelativeDate" />
    </div>
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

const receivedAtRelativeDate = computed(() => {
  return formatRelativeDateFromISO(mail.receivedAt, currentLanguage)
})
</script>
