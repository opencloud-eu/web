<template>
  <div class="mailbox-tree h-full px-1">
    <h1 class="text-lg ml-4 truncate" v-text="account.name" />
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
              :class="{ '!bg-role-secondary-container': selectedMailbox?.id === mailbox.id }"
              no-hover
              justify-content="left"
              appearance="raw"
              size="small"
              @click="$emit('select', mailbox)"
            >
              <oc-icon name="folder" class="mr-2" fill-type="line" />
              <span v-text="mailbox.name" />
            </oc-button>
          </li>
        </oc-list>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { NoContentMessage } from '@opencloud-eu/web-pkg'
import { $gettext } from '@opencloud-eu/web-pkg/src/router/utils'
import type { MailAccount, Mailbox } from '../types'
import { AppLoadingSpinner } from '@opencloud-eu/web-pkg/src'

const {
  account,
  mailboxes = null,
  isLoading = false,
  selectedMailbox = null
} = defineProps<{
  account: MailAccount
  mailboxes?: Mailbox[]
  selectedMailbox?: Mailbox
  isLoading?: boolean
}>()

defineEmits<{
  (e: 'select', payload: Mailbox): void
}>()
</script>
