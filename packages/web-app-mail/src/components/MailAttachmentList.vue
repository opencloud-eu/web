<template>
  <div class="mail-attachment-list" v-if="attachments.length">
    <oc-card
      title="mail-attachments"
      header-class="items-start pl-0"
      :body-class="['bg-role-surface', 'rounded-xl', 'mt-2', collapsed ? 'hidden' : '']"
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
          <oc-button
            appearance="raw"
            no-hover
            :aria-label="collapsed ? $gettext('Expand') : $gettext('Collapse')"
            @click="collapsed = !collapsed"
          >
            <oc-icon :name="collapsed ? 'arrow-down-s' : 'arrow-up-s'" fill-type="line" />
          </oc-button>
        </div>
      </template>

      <oc-list
        class="mail-attachment-itemslist -mx-4 grid grid-cols-1 gap-4 sm:[grid-template-columns:repeat(auto-fit,minmax(min(335px,100%),335px))]"
      >
        <li
          v-for="attachment in attachments"
          :key="getKey(attachment)"
          class="mail-attachment-item w-full rounded-xl bg-role-surface-container pl-2 pr-4 py-2"
        >
          <MailAttachmentItem
            :attachment="attachment"
            :account-id="accountId"
            :mode="mode"
            @remove="(id) => $emit('remove', id)"
          />
        </li>
      </oc-list>
    </oc-card>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { MailBodyPart } from '../types'
import type { MailComposeAttachment } from './MailComposeForm.vue'
import MailAttachmentItem from './MailAttachmentItem.vue'
import { hasBlobId, hasId } from '../helpers/mailAttachmentGuards'

type Attachment = MailBodyPart | MailComposeAttachment

const {
  attachments,
  accountId,
  mode = 'download'
} = defineProps<{
  attachments: Attachment[]
  accountId?: string
  mode?: 'download' | 'compose'
}>()

defineEmits<{
  (e: 'remove', id: string): void
}>()

const { $gettext, $ngettext } = useGettext()

const collapsed = ref(mode === 'download' ? attachments.length > 3 : false)

watch(
  () => attachments.length,
  (len) => {
    if (mode === 'download') collapsed.value = len > 3
  }
)

const getKey = (a: Attachment) => {
  if (hasBlobId(a)) {
    return a.blobId
  }
  if (hasId(a)) {
    return a.id
  }
  return a.name
}
</script>
