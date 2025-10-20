<template>
  <div class="mail-details-body-attachment-list" v-if="attachments?.length">
    <div class="mail-details-body-attachment-list-header gap-2 flex items-center">
      <h3 class="text-base font-bold" v-text="$gettext('Attachments')" />
      <span
        class="inline-flex items-center justify-center rounded-full bg-gray-200 px-2"
        v-text="attachments.length"
      />
    </div>
    <div
      class="mail-details-body-attachment-list-items rounded-xl border-gray-200 bg-gray-200 space-y-2 p-4 rounded-lg"
    >
      <div v-for="(attachment, index) in attachments" :key="index">
        <MailAttachmentItem :attachment="attachment" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import MailAttachmentItem from './MailAttachmentItem.vue'

const { attachments } = defineProps<{
  attachments: Array<any>
}>()
</script>
