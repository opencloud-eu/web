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
          @click="$emit('back')"
        >
          <oc-icon name="arrow-left" fill-type="line" />
        </oc-button>
        <h2 class="text-lg ml-4" v-text="currentMailbox.name"></h2>
        <div class="paceholder" />
      </div>
      <div class="py-2 px-4">
        <oc-button
          id="new-email-menu-btn"
          type="router-link"
          :to="{ name: 'mail-create', query: { ...route.query, draftId: 'new' } }"
          class="w-full"
          appearance="filled"
        >
          <oc-icon name="edit-box" fill-type="line" />
          <span v-text="$gettext('Write new Email')" />
        </oc-button>
      </div>
      <no-content-message
        v-if="!mails || !mails.length"
        class="mail-list-empty"
        icon="mail-forbid"
        icon-fill-type="line"
      >
        <template #message>
          <span v-text="$gettext('No mails in this mailbox')" />
        </template>
      </no-content-message>
      <oc-list v-else class="mail-list">
        <li
          v-for="mail in mails"
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
import { AppLoadingSpinner, NoContentMessage } from '@opencloud-eu/web-pkg'
import MailListItem from './MailListItem.vue'
import { Mail } from '../types'
import { useRoute } from 'vue-router'
import { useLoadMails } from '../composables/useLoadMails'
import { useMailsStore } from '../composables/piniaStores/mails'
import { useMailboxesStore } from '../composables/piniaStores/mailboxes'
import { storeToRefs } from 'pinia'
import { useLoadMail } from '../composables/useLoadMail'
import { unref } from 'vue'
import { useAccountsStore } from '../composables/piniaStores/accounts'

const route = useRoute()
const accountsStore = useAccountsStore()
const { currentAccount } = storeToRefs(accountsStore)
const mailsStore = useMailsStore()
const mailboxesStore = useMailboxesStore()
const { currentMail, mails } = storeToRefs(mailsStore)
const { setCurrentMail, updateMailField } = mailsStore
const { currentMailbox } = storeToRefs(mailboxesStore)
const { loadMail } = useLoadMail()

const { isLoading } = useLoadMails()

const onSelectMail = async (mail: Mail) => {
  const loadedMail = await loadMail(unref(currentAccount).accountId, mail.id)
  setCurrentMail(loadedMail)
  updateMailField({ id: unref(currentMail).id, field: 'keywords', value: { seen: true } })
}
</script>
