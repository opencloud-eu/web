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
import { Mail, MailBodyPart } from '../types'
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

const mailBody = computed(() => buildMailBody(mail))

const receivedAtRelativeDate = computed(() => {
  return formatRelativeDateFromISO(mail.receivedAt, currentLanguage)
})

function getPartIdsFromHtmlBody(parts?: MailBodyPart[]): string[] {
  if (!parts?.length) {
    return []
  }
  const partIds: string[] = []
  for (const p of parts) {
    if (p.partId) {
      partIds.push(p.partId)
    }
    if (p.subParts?.length) {
      partIds.push(...getPartIdsFromHtmlBody(p.subParts))
    }
  }
  return partIds
}

function buildMailBody(mail: Mail): string {
  const values = mail.bodyValues ?? {}

  const htmlbody = getPartIdsFromHtmlBody(mail.htmlBody)
    .map((partId) => values[partId]?.value || '')
    .filter(Boolean)
    .join('')
  return htmlbody
  // wenn kein html body dann text body fhlt noch
}
</script>
