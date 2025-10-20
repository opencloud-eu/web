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
          <oc-button appearance="raw" @click="collapsed = !collapsed">
            <oc-icon :name="collapsed ? 'arrow-down-s' : 'arrow-up-s'" fill-type="line" />
          </oc-button>
        </div>
      </template>
      <MailAttachmentItem
        v-for="attachment in attachments"
        :key="attachment.blobId"
        :attachment="attachment"
      />
    </oc-card>
  </div>
</template>

<script setup lang="ts">
import { MailBodyPart } from '../types'
import MailAttachmentItem from './MailAttachmentItem.vue'
import { ref } from 'vue'

const { attachments } = defineProps<{
  attachments: MailBodyPart[]
}>()
const collapsed = ref(attachments.length > 3)
</script>
