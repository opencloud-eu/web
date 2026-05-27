<template>
  <object class="pdf-viewer size-full overflow-hidden" :data="url" :type="objectType" />
</template>

<script setup lang="ts">
import type { ResourceEditorBindings } from '@opencloud-eu/web-pkg'

defineProps<Pick<ResourceEditorBindings, 'url'>>()

const isSafari = navigator.userAgent?.includes('Safari') && !navigator.userAgent?.includes('Chrome')
const objectType = isSafari ? undefined : 'application/pdf'
</script>
