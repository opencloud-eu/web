<template>
  <div class="oc-text-editor size-full" :class="{ 'overflow-auto': isReadOnly }">
    <TextEditorProvider :editor="textEditor">
      <TextEditorToolbar v-if="!isReadOnly" />
      <TextEditorContent />
    </TextEditorProvider>
  </div>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import {
  ContentType,
  useTextEditor,
  TextEditorProvider,
  TextEditorContent,
  TextEditorToolbar
} from '@opencloud-eu/web-pkg/editor'
import type { Resource } from '@opencloud-eu/web-client'

const {
  currentContent,
  contentType = undefined,
  isReadOnly = false,
  resource
} = defineProps<{
  currentContent: string
  contentType?: ContentType
  isReadOnly?: boolean
  resource: Resource
}>()

const emit = defineEmits<{
  (e: 'update:currentContent', value: string): void
}>()

const parsedContentType = computed<ContentType>(() => {
  if (contentType !== undefined) {
    return contentType
  }
  const ext = resource?.extension?.toLowerCase()
  const mimeType = resource?.mimeType?.toLowerCase()
  if (ext === 'md' || ext === 'markdown' || mimeType === 'text/markdown') {
    return 'markdown'
  }
  if (ext === 'html' || ext === 'htm' || mimeType === 'text/html') {
    return 'html'
  }
  if (ext === 'json' || mimeType === 'application/json') {
    return 'tiptap-json'
  }
  return 'plain-text'
})

const textEditor = useTextEditor({
  contentType: unref(parsedContentType),
  modelValue: currentContent,
  readonly: isReadOnly,
  onUpdate: (content) => emit('update:currentContent', content)
})
</script>
