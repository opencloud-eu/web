<template>
  <div class="mail-list-item flex w-full">
    <div class="mail-list-item-avatar">
      <div class="flex items-center">
        <span class="mail-list-item-indicator flex w-[12px]">
          <oc-icon v-if="isUnread" size="xsmall" name="circle" color="var(--oc-role-error)" />
        </span>
        <oc-avatar class="ml-1" :user-name="from[0]?.name || sender[0]?.name" />
      </div>
    </div>
    <div class="mail-list-item-content ml-5 min-w-0 w-full">
      <div class="mail-list-item-header">
        <div class="mail-list-item-sender flex items-center justify-between gap-2">
          <span class="font-bold text-xl truncate flex-1" v-text="fromText"></span>
          <span class="mail-list-item-received-at" v-text="receivedAtRelativeDate" />
        </div>
      </div>
      <div class="mail-list-item-subject font-bold mt-1">
        <span class="block font-bold truncate" v-text="subject" />
      </div>
      <div class="mail-list-item-preview text-role-on-surface-variant mt-1">
        <span class="line-clamp-2" v-text="preview"></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MailAddress } from '../types'
import { computed } from 'vue'
import { formatRelativeDateFromISO } from '@opencloud-eu/web-pkg/src'
import { useGettext } from 'vue3-gettext'

const {
  from,
  sender,
  subject,
  preview = '',
  receivedAt = '',
  isUnread = false
} = defineProps<{
  from: MailAddress[]
  sender: MailAddress[]
  subject: string
  preview?: string
  receivedAt?: string
  isUnread?: boolean
}>()

const { current: currentLanguage } = useGettext()

const fromText = computed(() => {
  return from[0]?.name || sender[0]?.name || from[0]?.email || sender[0]?.email
})

const receivedAtRelativeDate = computed(() => {
  return formatRelativeDateFromISO(receivedAt, currentLanguage)
})
</script>
