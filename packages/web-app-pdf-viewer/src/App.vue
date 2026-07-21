<template>
  <iframe
    v-if="isFirefox"
    class="pdf-viewer size-full overflow-hidden"
    :src="url"
    :title="resource?.name"
  />
  <object v-else class="pdf-viewer size-full overflow-hidden" :data="url" :type="objectType">
    <div
      class="pdf-viewer-fallback flex size-full flex-col items-center justify-center gap-4 p-8 text-center"
    >
      <p class="text-lg" v-text="$gettext('This PDF could not be displayed in your browser.')" />
      <oc-button type="a" appearance="filled" :href="url" :download="resource?.name">
        <oc-icon name="download" fill-type="line" />
        {{ $gettext('Download PDF') }}
      </oc-button>
    </div>
  </object>
</template>

<script setup lang="ts">
import { Resource } from '@opencloud-eu/web-client'

const { url, resource = undefined } = defineProps<{
  url: string
  resource?: Resource
}>()

const userAgent = navigator.userAgent || ''

// Firefox renders blob: PDFs unreliably in <object>/<embed> (often a blank frame), so it
// gets an <iframe> instead, which handles blob: URLs reliably. Other browsers keep <object>:
// it supports fallback content, and <iframe> is known to struggle with PDFs on iOS Safari.
const isFirefox = userAgent.includes('Firefox')

// Safari does not support the `type` attribute on <object> for PDFs, so it is omitted to
// avoid a blank frame. Other browsers get the type attribute, which helps them render PDFs.
const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome')
const objectType = isSafari ? undefined : 'application/pdf'
</script>
