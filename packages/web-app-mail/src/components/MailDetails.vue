<template>
  <app-loading-spinner v-if="isLoading" />
  <template v-else>
    <no-content-message v-if="!currentMail" icon="mail" icon-fill-type="line">
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
        <h3 class="text-lg block truncate" v-text="currentMail.subject" />
        <MailIndicators :mail="currentMail" />
      </div>
      <div class="mail-details-subheader mt-2 flex min-w-0 justify-between">
        <div class="shrink-0">
          <oc-avatar :user-name="currentMail.from[0]?.name || currentMail.sender[0]?.name" />
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
        :account-id="currentAccount.accountId"
        :appointments="appointments"
      />
      <div class="mail-details-body mt-6" v-html="mailBody" />
      <MailAttachmentList
        v-if="currentMail.attachments.length"
        class="mail-details-attachments my-6"
        :attachments="currentMail.attachments"
        :account-id="currentAccount.accountId"
      />
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { formatRelativeDateFromISO, NoContentMessage } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import { buildMailBody } from '../helpers'
import MailAttachmentList from './MailAttachmentList.vue'
import MailIndicators from './MailIndicators.vue'
import { AppLoadingSpinner } from '@opencloud-eu/web-pkg'
import MailAppointmentList from './MailAppointmentList.vue'
import { useLoadMail } from '../composables/useLoadMail'
import { useAccountsStore } from '../composables/piniaStores/accounts'
import { useMailsStore } from '../composables/piniaStores/mails'
import { storeToRefs } from 'pinia'

defineEmits<{
  (e: 'back'): void
}>()

const { isLoading } = useLoadMail()

const { current: currentLanguage } = useGettext()
const accountsStore = useAccountsStore()
const mailsStore = useMailsStore()
const { currentAccount } = storeToRefs(accountsStore)
const { currentMail } = storeToRefs(mailsStore)

const fromEmail = computed(() => {
  return unref(currentMail)?.from[0]?.email || unref(currentMail)?.sender[0]?.email
})

const fromName = computed(() => {
  return unref(currentMail)?.from[0]?.name || unref(currentMail)?.sender[0]?.name
})

const sendToNames = computed(() => {
  return unref(currentMail)
    .to.map((t) => t.name || t.email)
    .join(', ')
})

const mailBody = computed(() => (unref(currentMail) ? buildMailBody(unref(currentMail)) : ''))

const receivedAtRelativeDate = computed(() => {
  if (!unref(currentMail)?.receivedAt) {
    return ''
  }
  return formatRelativeDateFromISO(unref(currentMail).receivedAt, currentLanguage)
})

const appointments = computed(() => {
  return unref(currentMail).attachments?.filter((attachment) => attachment.type === 'text/calendar')
})
</script>
