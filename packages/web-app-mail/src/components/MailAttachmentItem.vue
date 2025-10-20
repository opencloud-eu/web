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
import { computed, defineProps, unref } from 'vue'
import { MailBodyPart } from '../types'
import { useTask } from 'vue-concurrency'
import { useClientService, useConfigStore, formatFileSize } from '@opencloud-eu/web-pkg'
import { useGettext } from 'vue3-gettext'
import ResourceIcon from '@opencloud-eu/web-pkg/src/components/FilesList/ResourceIcon.vue'
import { extractExtensionFromFile } from '@opencloud-eu/web-client'

const { attachment } = defineProps<{
  attachment: MailBodyPart
}>()

const clientService = useClientService()
const configStore = useConfigStore()
const { current: currentLanguage } = useGettext()

const readableFileSize = computed(() => {
  return formatFileSize(attachment.size, currentLanguage)
})

const download = () => {
  clientService.httpAuthenticated.get(
    urlJoin(configStore.groupwareUrl, `blob/${attachment.blobId}/${attachment.name}`),
    {}
  )
}
</script>
