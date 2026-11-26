<template>
  <oc-list raw class="pdf-viewer-attachments flex flex-col gap-2">
    <li v-for="{ attachment, resource } in items" :key="attachment.key">
      <oc-button
        :title="attachment.description || undefined"
        class="pdf-viewer-attachment w-full rounded-xl bg-role-surface-container p-3 text-left hover:bg-role-surface-container-high"
        :aria-label="$gettext('Download %{name}', { name: attachment.filename })"
        appearance="raw-inverse"
        color-role="surface"
        justify-content="left"
        gap-size="medium"
        no-hover
        @click="emit('open', attachment)"
      >
        <resource-icon :resource="resource" size-class="size-8 shrink-0" />
        <span class="flex min-w-0 flex-1 flex-col">
          <span class="break-words text-sm font-semibold" dir="auto" v-text="attachment.filename" />
          <span
            class="line-clamp-2 text-xs text-role-on-surface-variant"
            dir="auto"
            v-text="attachment.description || getFileType(resource)"
          />
        </span>
        <oc-icon
          name="download-2"
          fill-type="line"
          size-class="size-4"
          class="shrink-0 text-role-on-surface-variant"
        />
      </oc-button>
    </li>
  </oc-list>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import { extractExtensionFromFile, type Resource } from '@opencloud-eu/web-client'
import { ResourceIcon } from '@opencloud-eu/web-pkg'
import type { PdfAttachment } from '../composables/usePdfAttachments'

const { attachments } = defineProps<{ attachments: PdfAttachment[] }>()

const emit = defineEmits<{ open: [attachment: PdfAttachment] }>()

const { $gettext } = useGettext()

// For the file type icon.
const items = computed(() =>
  attachments.map((attachment) => {
    const name = attachment.filename
    const extension = extractExtensionFromFile({ name } as Resource)
    return { attachment, resource: { name, extension, type: 'file' } as Resource }
  })
)

function getFileType({ extension }: Resource) {
  return extension ? $gettext('%{type} file', { type: extension.toUpperCase() }) : $gettext('File')
}
</script>
