<script setup lang="ts">
import { type PropType } from 'vue'
import type { Resource } from '@opencloud-eu/web-client'
import { CollaborativeWrapper, type AppConfigObject } from '@opencloud-eu/web-pkg'
import CodeMirrorEditor from './CodeMirrorEditor.vue'
import { codemirrorMarkdownAdapter } from './adapters/codemirrorMarkdown'
import pkg from '../package.json'

defineProps({
  applicationConfig: { type: Object as PropType<AppConfigObject>, required: true },
  currentContent: { type: String, required: true },
  isReadOnly: { type: Boolean, required: false, default: false },
  resource: { type: Object as PropType<Resource>, required: true }
})

// Declaring `update:currentContent` here is how the hosting AppWrapper
// detects this as an editor (isEditor): the topbar shows the Save action,
// Ctrl+S binds, the unsaved-changes route-leave modal arms, and the
// auto-save loop arms (or stays off if `disableAutoSave` is passed).
defineEmits<{
  (e: 'update:currentContent', value: string): void
  (e: 'update:serverContent', value: string): void
  (e: 'update:etag', value: string): void
}>()
</script>

<template>
  <CollaborativeWrapper
    :resource="resource"
    :current-content="currentContent"
    :is-read-only="isReadOnly"
    :adapter="codemirrorMarkdownAdapter"
    :editor="CodeMirrorEditor"
    :app-version="pkg.version"
    document-prefix="codemirror"
    :realtime-url="(applicationConfig?.realtimeUrl as string | null | undefined) ?? undefined"
    @update:current-content="$emit('update:currentContent', $event)"
    @update:server-content="$emit('update:serverContent', $event)"
    @update:etag="$emit('update:etag', $event)"
  />
</template>
