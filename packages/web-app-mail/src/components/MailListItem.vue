<template>
  <div class="mail-list-item flex">
    <oc-avatar class="mt-2" :user-name="from[0]?.name || sender[0]?.name" />

    <div class="mail-list-item-content ml-5 min-w-0 w-full">
      <div class="mail-list-item-header">
        <div class="mail-list-item-sender flex items-center justify-between gap-2">
          <span class="font-bold text-xl truncate flex-1">{{
            from[0]?.name || sender[0]?.name || from[0]?.email || sender[0]?.email
          }}</span>

          <span>{{ DateTime.fromISO(receivedAt).toLocaleString(DateTime.DATETIME_MED) }}</span>
        </div>
      </div>
      <div class="mail-list-item-subject font-bold mt-1">
        <span class="block font-bold truncate" :title="subject">
          {{ subject }}
        </span>
      </div>
      <div class="mail-list-item-preview text-role-on-surface-variant mt-1">
        <span class="line-clamp-2">{{ preview }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DateTime } from 'luxon'
import { MailAddress } from '../types'

const props = defineProps<{
  from: MailAddress[]
  sender: MailAddress[]
  subject: string
  preview?: string
  receivedAt?: string
  isUnread?: boolean
}>()
</script>
