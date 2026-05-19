<template>
  <div class="oc-text-editor size-full" :class="{ 'overflow-auto': isReadOnly }">
    <TextEditorProvider :editor="textEditor">
      <TextEditorToolbar v-if="!isReadOnly" />
      <TextEditorContent />
    </TextEditorProvider>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
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

const { $gettext } = useGettext()

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

const placeholder = computed(() => {
  if (isReadOnly || unref(parsedContentType) !== 'markdown') {
    return undefined
  }
  return $gettext('Write or type / for formatting options...')
})

const textEditor = useTextEditor({
  contentType: unref(parsedContentType),
  modelValue: toRef(() => currentContent),
  readonly: isReadOnly,
  placeholder: unref(placeholder),
  onUpdate: (content) => emit('update:currentContent', content)
})
</script>
