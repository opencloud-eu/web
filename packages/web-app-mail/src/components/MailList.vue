<template>
  <app-loading-spinner v-if="isLoading" />
  <template v-else>
    <no-content-message v-if="!mailbox" icon="inbox" icon-fill-type="line">
      <template #message>
        <span v-text="$gettext('No mailbox selected')" />
      </template>
    </no-content-message>
    <template v-else>
      <h2 class="text-lg ml-4" v-text="mailbox.name" />
      <oc-list class="mail-list">
        <no-content-message
          v-if="!mails.length"
          class="mail-list-empty"
          icon="mail-forbid"
          icon-fill-type="line"
        >
          <template #message>
            <span v-text="$gettext('No mails in this mailbox')" />
          </template>
        </no-content-message>
        <li
          v-for="mail in mails"
          v-else
          :key="mail.id"
          class="border-b-2"
          :class="{ 'bg-role-secondary-container': selectedMail.id === mail.id }"
        >
          <oc-button
            class="px-2 py-4 text-left w-full"
            justify-content="left"
            appearance="raw"
            gap-size="none"
            no-hover
            @click="$emit('select-mail', mail)"
          >
            <MailListItem :mail="mail" />
          </oc-button>
        </li>
      </oc-list>
    </template>
  </template>
</template>

<script setup lang="ts">
import { AppLoadingSpinner, NoContentMessage } from '@opencloud-eu/web-pkg'
import MailListItem from './MailListItem.vue'
import { Mail, Mailbox } from '../types'

const {
  mails = [],
  mailbox = {},
  selectedMail = {},
  isLoading = false
} = defineProps<{
  mails?: Mail[]
  mailbox?: Mailbox
  selectedMail?: Mail
  isLoading?: boolean
}>()

defineEmits<{
  (e: 'select-mail', mail: Mail): void
}>()
</script>
