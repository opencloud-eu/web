<template>
  <app-loading-spinner v-if="isLoading" />
  <template v-else>
    <oc-floating-action-button
      class="md:hidden"
      mode="action"
      :aria-label="$gettext('Write new Email')"
      @click="showCompose = true"
    />
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
      <MailWidget v-if="showCompose" :model-value="true" @close="showCompose = false" />
    </template>
  </template>
</template>

<script setup lang="ts">
import { AppLoadingSpinner, NoContentMessage } from '@opencloud-eu/web-pkg'
import MailListItem from './MailListItem.vue'
import MailWidget from './MailWidget.vue'
import type { Mail } from '../types'
import { useLoadMails } from '../composables/useLoadMails'
import { useMailsStore } from '../composables/piniaStores/mails'
import { useMailboxesStore } from '../composables/piniaStores/mailboxes'
import { storeToRefs } from 'pinia'
import { useLoadMail } from '../composables/useLoadMail'
import { ref, unref } from 'vue'
import { useAccountsStore } from '../composables/piniaStores/accounts'

const accountsStore = useAccountsStore()
const { currentAccount } = storeToRefs(accountsStore)

const mailsStore = useMailsStore()
const mailboxesStore = useMailboxesStore()
const { currentMail, mails } = storeToRefs(mailsStore)
const { updateMailField, setCurrentMail } = mailsStore
const { currentMailbox } = storeToRefs(mailboxesStore)
const { setCurrentMailbox } = mailboxesStore
const { loadMail } = useLoadMail()
const { isLoading } = useLoadMails()

const showCompose = ref(false)

const openCompose = () => {
  showCompose.value = true
}

defineExpose({
  openCompose
})

const onNavigateBack = () => {
  setCurrentMailbox(null)
  setCurrentMail(null)
}

const onSelectMail = async (mail: Mail) => {
  await loadMail(unref(currentAccount).accountId, mail.id)

  updateMailField({
    id: mail.id,
    field: 'keywords',
    value: { ...mail.keywords, ...{ $seen: true } }
  })
}
</script>
