<template>
  <div class="mailbox-tree h-full px-1 flex flex-col">
    <div>
      <div class="px-2 py-4">
        <oc-button
          id="new-email-menu-btn"
          class="w-full hidden md:flex"
          appearance="filled"
          @click="$emit('composeMail')"
        >
          <oc-icon name="edit-box" fill-type="line" />
          <span v-text="$gettext('Write new Email')" />
        </oc-button>
      </div>
      <app-loading-spinner v-if="isLoading" />
      <template v-else>
        <no-content-message v-if="!mailboxes?.length" icon="folder-reduce" icon-fill-type="line">
          <template #message>
            <span v-text="$gettext('No mailboxes found')" />
          </template>
        </no-content-message>
        <div v-else>
          <oc-list class="mailbox-tree mt-1">
            <li v-for="mailbox in mailboxes" :key="mailbox.id" class="pb-1 px-2">
              <oc-button
                class="w-full p-2 hover:bg-role-surface-container-highest focus:bg-role-surface-container-highest"
                :class="{ '!bg-role-secondary-container': currentMailbox?.id === mailbox.id }"
                no-hover
                justify-content="left"
                appearance="raw"
                size="small"
                @click="onSelectMailbox(mailbox)"
              >
                <div class="flex items-center justify-between w-full">
                  <div class="flex items-center truncate">
                    <oc-icon name="folder" class="mr-2" fill-type="line" />
                    <span class="truncate" v-text="mailbox.name" />
                  </div>
                  <oc-tag
                    v-if="mailbox.unreadEmails"
                    v-oc-tooltip="$gettext('Unread emails')"
                    class="ml-2"
                    appearance="filled"
                    :rounded="true"
                    ><span v-text="mailbox.unreadEmails"
                  /></oc-tag>
                </div>
              </oc-button>
            </li>
          </oc-list>
        </div>
      </template>
    </div>
    <div class="w-full self-end mt-auto px-2 py-4">
      <MailAccountSwitch />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Mailbox } from '../types'
import { AppLoadingSpinner, NoContentMessage } from '@opencloud-eu/web-pkg'
import { useLoadMailboxes } from '../composables/useLoadMailboxes'
import { useMailboxesStore } from '../composables/piniaStores/mailboxes'
import { storeToRefs } from 'pinia'
import { useAccountsStore } from '../composables/piniaStores/accounts'
import { useMailsStore } from '../composables/piniaStores/mails'
import { useLoadMails } from '../composables/useLoadMails'
import { unref } from 'vue'
import MailAccountSwitch from './MailAccountSwitch.vue'

const emit = defineEmits<{
  (e: 'composeMail'): void
}>()

const mailboxesStore = useMailboxesStore()
const accountsStore = useAccountsStore()
const { mailboxes, currentMailbox } = storeToRefs(mailboxesStore)
const { setCurrentMailbox } = mailboxesStore
const { currentAccount } = storeToRefs(accountsStore)
const { setCurrentMail } = useMailsStore()
const { loadMails } = useLoadMails()
const { isLoading } = useLoadMailboxes()

const onSelectMailbox = async (mailbox: Mailbox) => {
  setCurrentMailbox(mailbox)
  setCurrentMail(null)
  await loadMails(unref(currentAccount).accountId, mailbox.id)
}
</script>
