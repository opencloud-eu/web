<template>
  <div class="mail-attachment-item flex justify-between items-center">
    <div class="mail-attachment-item-info flex items-center flex-1 min-w-0">
      <oc-icon
        :name="icon?.name ?? 'file-2'"
        :color="icon?.color"
        size="large"
        class="inline-flex items-center"
      />
      <div class="mail-attachment-item-details flex ml-2 flex-col min-w-0">
        <span
          class="mail-attachment-item-filename truncate"
          :title="attachment.name"
          v-text="attachment.name"
        />
        <span class="mail-attachment-item-size mt-1" v-text="readableFileSize" />
      </div>
    </div>
    <div class="mail-attachment-item-actions ml-1 flex items-center">
      <oc-button
        v-if="mode === 'compose'"
        appearance="raw"
        :aria-label="$gettext('Remove attachment')"
        @click="remove"
      >
        <oc-icon size="medium" name="delete-bin-6-line" fill-type="none" />
      </oc-button>
      <oc-button
        v-else
        appearance="raw"
        :aria-label="$gettext('Download attachment')"
        :disabled="!canDownload"
        @click="download"
      >
        <oc-icon size="medium" name="download-2" fill-type="line" />
      </oc-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { urlJoin } from '@opencloud-eu/web-client'
import { computed, inject } from 'vue'
import type { MailBodyPart } from '../types'
import type { MailComposeAttachment } from './MailComposeForm.vue'
import {
  useClientService,
  useConfigStore,
  formatFileSize,
  useMessages,
  ResourceIconMapping,
  resourceIconMappingInjectionKey,
  createDefaultFileIconMapping,
  triggerDownloadWithFilename
} from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'

type Attachment = MailBodyPart | MailComposeAttachment

const {
  attachment,
  accountId,
  mode = 'download'
} = defineProps<{
  attachment: Attachment
  accountId?: string
  mode?: 'download' | 'compose'
}>()

const emit = defineEmits<{
  (e: 'remove', id: string): void
}>()

const clientService = useClientService()
const configStore = useConfigStore()
const { showErrorMessage } = useMessages()
const { current: currentLanguage, $gettext } = useGettext()

const iconMappingInjection = inject<ResourceIconMapping>(resourceIconMappingInjectionKey)
const defaultFileIconMapping = createDefaultFileIconMapping()

const mimeType = computed(() => {
  return (attachment as any).type || (attachment as any).mimeType || ''
})

const readableFileSize = computed(() => {
  return formatFileSize((attachment as any).size, currentLanguage)
})

const icon = computed(() => {
  const extension = attachment.name.split('.').pop()
  return (
    (extension && defaultFileIconMapping[extension as keyof typeof defaultFileIconMapping]) ||
    (mimeType.value && iconMappingInjection?.mimeType?.[mimeType.value]) ||
    (extension && iconMappingInjection?.extension?.[extension])
  )
})

const isMailBodyPart = (value: Attachment): value is MailBodyPart => {
  return 'blobId' in value
}

const canDownload = computed(() => {
  return mode === 'download' && !!accountId && isMailBodyPart(attachment)
})

const download = async () => {
  if (!canDownload.value || !isMailBodyPart(attachment)) {
    return
  }

  const attachmentFile = attachment
  const url = urlJoin(
    configStore.groupwareUrl,
    `/accounts/${accountId}/blobs/${attachmentFile.blobId}/${encodeURIComponent(attachmentFile.name)}`
  )

  try {
    const { data }: { data: Blob } = await clientService.httpAuthenticated.get(url, {
      responseType: 'blob'
    })

    const objectUrl = URL.createObjectURL(data)
    triggerDownloadWithFilename(objectUrl, attachmentFile.name)
  } catch (e) {
    console.error(e)
    showErrorMessage({
      title: $gettext('Failed to download %{name}', { name: attachmentFile.name }),
      errors: [e]
    })
  }
}

const remove = () => {
  const id = (attachment as any).id ?? (attachment as any).blobId
  if (!id) {
    return
  }
  emit('remove', String(id))
}
</script>
