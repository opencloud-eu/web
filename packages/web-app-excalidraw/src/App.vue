<template>
  <CollaborativeWrapper
    :resource="resource"
    :current-content="currentContent"
    :is-read-only="isReadOnly"
    :adapter="excalidrawAdapter"
    :editor="ExcalidrawEditor"
    :app-version="pkg.version"
    document-prefix="excalidraw"
    :realtime-url="(applicationConfig?.realtimeUrl as string | null | undefined) ?? null"
    @update:current-content="$emit('update:currentContent', $event)"
    @update:server-content="$emit('update:serverContent', $event)"
    @update:etag="$emit('update:etag', $event)"
  />
</template>

<script setup lang="ts">
import { type PropType } from 'vue'
import { CollaborativeWrapper, type AppConfigObject } from '@opencloud-eu/web-pkg'
import type { Resource } from '@opencloud-eu/web-client'
import { excalidrawAdapter } from './adapters/excalidrawAdapter'
import ExcalidrawEditor from './ExcalidrawEditor.vue'
import pkg from '../package.json'

defineProps({
  applicationConfig: { type: Object as PropType<AppConfigObject>, required: true },
  currentContent: { type: String, required: true },
  isReadOnly: { type: Boolean, required: false, default: false },
  resource: { type: Object as PropType<Resource>, required: true }
})

defineEmits<{
  (e: 'update:currentContent', value: string): void
  (e: 'update:serverContent', value: string): void
  (e: 'update:etag', value: string): void
}>()
</script>
