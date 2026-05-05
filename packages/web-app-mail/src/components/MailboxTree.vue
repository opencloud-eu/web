<template>
  <div class="mailbox-tree px-1 flex flex-col">
    <app-loading-spinner v-if="isLoading" />
    <oc-list v-else>
      <li v-for="mailbox in mailboxes" :key="mailbox.id" class="pb-1 px-2">
        <oc-button
          :class="[
            'sidebar-mailbox-item',
            'relative',
            'w-full',
            'whitespace-nowrap',
            'px-2',
            'py-3',
            'select-none',
            'rounded-xl',
            { 'active overflow-hidden outline': currentMailbox?.id === mailbox.id },
            {
              'hover:bg-role-surface-container-highest focus:bg-role-surface-container-highest':
                currentMailbox?.id !== mailbox.id
            }
          ]"
          :appearance="currentMailbox?.id === mailbox.id ? 'filled' : 'raw-inverse'"
          color-role="surface"
          justify-content="left"
          @click="onSelectMailbox(mailbox)"
        >
          <div class="flex items-center justify-between w-full">
            <div class="flex items-center truncate">
              <oc-icon name="folder" class="mr-2" fill-type="line" />
              <span class="truncate font-bold" v-text="mailbox.name" />
            </div>
            <oc-tag
              v-if="mailbox.unreadEmails"
              v-oc-tooltip="$gettext('Unread emails')"
              :rounded="true"
              class="ml-2"
              appearance="filled"
              size="small"
              ><span v-text="mailbox.unreadEmails"
            /></oc-tag>
          </div>
        </oc-button>
      </li>
    </oc-list>
  </div>
</template>

<script setup lang="ts">
import type { Mailbox } from '../types'
import { AppLoadingSpinner, useGroupwareAccountsStore, useRouteQuery } from '@opencloud-eu/web-pkg'
import { useLoadMailboxes } from '../composables/useLoadMailboxes'
import { useMailboxesStore } from '../composables/piniaStores/mailboxes'
import { storeToRefs } from 'pinia'
import { useMailsStore } from '../composables/piniaStores/mails'
import { useLoadMails } from '../composables/useLoadMails'
import { unref } from 'vue'

const mailboxesStore = useMailboxesStore()
const accountsStore = useGroupwareAccountsStore()
const { mailboxes, currentMailbox } = storeToRefs(mailboxesStore)
const { setCurrentMailbox } = mailboxesStore
const { currentAccount } = storeToRefs(accountsStore)
const { setCurrentMail } = useMailsStore()
const { loadMails } = useLoadMails()
const { isLoading } = useLoadMailboxes()
const currentMailboxIdQuery = useRouteQuery('mailboxId')

const onSelectMailbox = async (mailbox: Mailbox) => {
  setCurrentMailbox(mailbox)
  setCurrentMail(null)
  currentMailboxIdQuery.value = mailbox.id
  await loadMails(unref(currentAccount).accountId, mailbox.id)
}
</script>

<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer components {
  .sidebar-mailbox-item:is(.active) {
    outline-color: var(--oc-role-surface-container-highest);
  }
  .sidebar-mailbox-item:not(.active) {
    color: var(--oc-role-on-surface-variant);
  }
}
</style>
