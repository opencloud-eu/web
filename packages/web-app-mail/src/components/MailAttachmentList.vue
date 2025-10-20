<template>
  <div v-if="attachments?.length" class="mail-attachment-list">
    <oc-card
      title="mail-attachments"
      header-class="items-start pl-0"
      body-class="bg-role-surface-container rounded-xl mt-2"
      appearance="outlined"
    >
      <template #header>
        <div class="flex items-center">
          <span
            class="font-bold"
            v-text="$ngettext('Attachment', 'Attachments', attachments.length)"
          />
          <oc-tag class="ml-2" :rounded="true" appearance="filled" v-text="attachments.length" />
        </div>
      </template>
      <div v-for="(attachment, index) in attachments" :key="index">
        <MailAttachmentItem v-if="attachment.name" :attachment="attachment" />
      </div>
    </oc-card>
  </div>
</template>

<script setup lang="ts">
import { MailBodyPart } from '../types'
import MailAttachmentItem from './MailAttachmentItem.vue'

const { attachments } = defineProps<{
  attachments: MailBodyPart[]
}>()
</script>
