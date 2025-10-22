<template>
  <div class="mail-attachment-list">
    <oc-card
      title="mail-attachments"
      header-class="items-start pl-0"
      :body-class="['bg-role-surface-container', 'rounded-xl', 'mt-2', collapsed ? 'hidden' : '']"
      appearance="outlined"
    >
      <template #header>
        <div class="flex justify-between w-full">
          <div class="flex items-center">
            <span
              class="font-bold"
              v-text="$ngettext('Attachment', 'Attachments', attachments.length)"
            />
            <oc-tag class="ml-2" :rounded="true" appearance="filled">
              <span v-text="attachments.length" />
            </oc-tag>
          </div>
          <oc-button appearance="raw" no-hover @click="collapsed = !collapsed">
            <oc-icon :name="collapsed ? 'arrow-down-s' : 'arrow-up-s'" fill-type="line" />
          </oc-button>
        </div>
      </template>
      <oc-list class="mail-attachment-itemslist [&>li:not(:first-child)]:mt-4">
        <li
          v-for="attachment in attachments"
          :key="attachment.blobId"
          class="mail-attachment-item rounded-xl bg-role-surface-container-lowest pl-2 pr-4 py-2"
        >
          <MailAttachmentItem :attachment="attachment" :account-id="accountId" />
        </li>
      </oc-list>
    </oc-card>
  </div>
</template>

<script setup lang="ts">
import { MailBodyPart } from '../types'
import MailAttachmentItem from './MailAttachmentItem.vue'
import { ref } from 'vue'

const { attachments } = defineProps<{
  attachments: MailBodyPart[]
  accountId: string
}>()
const collapsed = ref(attachments.length > 3)
</script>
