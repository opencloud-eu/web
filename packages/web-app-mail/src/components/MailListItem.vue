<template>
  <div class="mail-list-item flex w-full">
    <div class="mail-list-item-avatar">
      <div class="flex items-center">
        <span class="mail-list-item-indicator flex w-[12px]">
          <oc-icon
            v-if="!mail.keywords?.['$seen']"
            size="xsmall"
            name="circle"
            color="var(--oc-role-error)"
          />
        </span>
        <oc-avatar class="ml-1" :user-name="mail.from[0]?.name || mail.sender[0]?.name" />
      </div>
    </div>
    <div class="mail-list-item-content ml-5 min-w-0 w-full">
      <div class="mail-list-item-header">
        <div class="mail-list-item-sender flex items-center justify-between gap-2">
          <span class="font-bold text-xl truncate flex-1" v-text="fromText"></span>
          <span class="mail-list-item-received-at" v-text="receivedAtRelativeDate" />
        </div>
      </div>
      <div class="mail-list-item-subject mt-1 flex justify-between items-center">
        <span class="block font-bold truncate" v-text="mail.subject" />
        <mail-indicators :mail="mail" />
      </div>
      <div class="mail-list-item-preview text-role-on-surface-variant mt-1">
        <span class="line-clamp-2" v-text="previewText"></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Mail } from '../types'
import { computed } from 'vue'
import { formatRelativeDateFromISO } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import MailIndicators from './MailIndicators.vue'
import DOMPurify from 'dompurify'

const { mail } = defineProps<{ mail: Mail }>()
const { current: currentLanguage } = useGettext()

const fromText = computed(() => {
  return mail.from[0]?.name || mail.sender[0]?.name || mail.from[0]?.email || mail.sender[0]?.email
})

const receivedAtRelativeDate = computed(() => {
  return formatRelativeDateFromISO(mail.receivedAt, currentLanguage)
})

const previewText = computed(() => {
  const mailPreview = mail.preview ?? ''
  if (!mailPreview) {
    return ''
  }

  const stripped = DOMPurify.sanitize(mailPreview, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
  return stripped.replace(/\s+/g, ' ').trim()
})
</script>
