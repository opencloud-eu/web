<template>
  <div class="mail-attachment-item flex justify-between items-center">
    <div class="mail-attachment-item-info flex items-center">
      <resource-icon
        size="xlarge"
        :resource="{
          mimeType: attachment.type,
          extension: extractExtensionFromFile({ name: attachment.name })
        }"
      />
      <div class="mail-attachment-item-details flex ml-2 flex-col">
        <span class="mail-attachment-item-filename" v-text="attachment.name" />
        <span class="mail-attachment-item-size mt-1" v-text="readableFileSize" />
      </div>
    </div>
    <div class="mail-attachment-item-actions">
      <oc-button appearance="raw" @click="download">
        <oc-icon size="large" name="download-2" fill-type="line" />
      </oc-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { urlJoin } from '@opencloud-eu/web-client'
import { computed, defineProps } from 'vue'
import { MailBodyPart } from '../types'
import {
  useClientService,
  useConfigStore,
  formatFileSize,
  useMessages
} from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import ResourceIcon from '@opencloud-eu/web-pkg/src/components/FilesList/ResourceIcon.vue'
import { extractExtensionFromFile } from '@opencloud-eu/web-client'

const { attachment } = defineProps<{
  attachment: MailBodyPart
}>()

const clientService = useClientService()
const configStore = useConfigStore()
const { showErrorMessage } = useMessages()
const { current: currentLanguage } = useGettext()
const { $gettext } = useGettext()

const readableFileSize = computed(() => {
  return formatFileSize(attachment.size, currentLanguage)
})

const download = async () => {
  const url = urlJoin(
    configStore.groupwareUrl,
    `blob/${attachment.blobId}/${encodeURIComponent(attachment.name)}`
  )

  try {
    const { data }: { data: Blob } = await clientService.httpAuthenticated.get(url, {
      responseType: 'blob'
    })

    const objectUrl = URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = attachment.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(objectUrl)
  } catch (e) {
    console.error(e)
    showErrorMessage({
      title: $gettext('Failed to download %{name}', { name: attachment.name }),
      errors: [e]
    })
  }
}
</script>
