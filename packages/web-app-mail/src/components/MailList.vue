<template>
  <app-loading-spinner v-if="isLoading" />
  <template v-else>
    <no-content-message v-if="!currentMailbox" icon="folder" icon-fill-type="line">
      <template #message>
        <span v-text="$gettext('No mailbox selected')" />
      </template>
    </no-content-message>

    <template v-else>
      <div class="flex w-full items-center justify-between md:justify-normal">
        <oc-button
          class="md:hidden block"
          appearance="raw"
          no-hover
          :aria-label="$gettext('Navigate back')"
          @click="onNavigateBack"
        >
          <oc-icon name="arrow-left" fill-type="line" />
        </oc-button>
        <h2 class="text-lg ml-4" v-text="currentMailbox.name" />
        <div class="placeholder" />
      </div>

      <no-content-message
        v-if="!mails || !mails.length"
        class="mail-list-empty"
        img-src="/images/empty-states/empty-mails.svg"
      >
        <template #message>
          <span v-text="$gettext('No mails in this mailbox')" />
        </template>
      </no-content-message>

      <oc-list v-else class="mail-list">
        <li
          v-for="mail in mails"
          :id="`mail-list-item-${mail.id}`"
          :key="mail.id"
          class="border-b-2"
          :class="{ 'bg-role-secondary-container': currentMail?.id === mail.id }"
        >
          <oc-button
            class="px-4 py-4 text-left w-full"
            justify-content="left"
            appearance="raw"
            gap-size="none"
            no-hover
            @click="onSelectMail(mail)"
          >
            <MailListItem :mail="mail" />
          </oc-button>
        </li>
      </oc-list>
    </template>
  </template>
</template>

<script setup lang="ts">
import {
  AppLoadingSpinner,
  NoContentMessage,
  useGroupwareAccountsStore
} from '@opencloud-eu/web-pkg'
import MailListItem from './MailListItem.vue'
import type { Mail } from '../types'
import { useLoadMails } from '../composables/useLoadMails'
import { useMailsStore } from '../composables/piniaStores/mails'
import { useMailboxesStore } from '../composables/piniaStores/mailboxes'
import { useRouteQuery } from '@opencloud-eu/web-pkg'
import { storeToRefs } from 'pinia'
import { useLoadMail } from '../composables/useLoadMail'
import { unref, watch, nextTick } from 'vue'

const mailsStore = useMailsStore()
const mailboxesStore = useMailboxesStore()
const accountsStore = useGroupwareAccountsStore()
const { loadMail } = useLoadMail()
const { isLoading } = useLoadMails()
const currentMailIdQuery = useRouteQuery('mailId')

const { currentAccount } = storeToRefs(accountsStore)
const { currentMail, mails } = storeToRefs(mailsStore)
const { updateMailField, setCurrentMail } = mailsStore
const { currentMailbox } = storeToRefs(mailboxesStore)
const { setCurrentMailbox } = mailboxesStore

const onNavigateBack = () => {
  setCurrentMailbox(null)
  setCurrentMail(null)
  currentMailIdQuery.value = null
}

const onSelectMail = async (mail: Mail) => {
  currentMailIdQuery.value = mail.id

  await loadMail(unref(currentAccount).accountId, mail.id)

  updateMailField({
    id: mail.id,
    field: 'keywords',
    value: { ...mail.keywords, ...{ $seen: true } }
  })
}

watch(
  [currentMail, isLoading],
  async ([mail, loading]) => {
    if (loading || !mail) {
      return
    }

    await nextTick()
    document.getElementById(`mail-list-item-${mail.id}`)?.scrollIntoView({ block: 'nearest' })
  },
  { immediate: true }
)
</script>
