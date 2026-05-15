<template>
  <div class="oc-text-editor size-full" :class="{ 'overflow-auto': isReadOnly }">
    <TextEditorProvider :editor="textEditor">
      <TextEditorToolbar v-if="!isReadOnly" />
      <TextEditorContent />
    </TextEditorProvider>
  </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue'
import {
  ContentType,
  TextEditorCollaborationOptions,
  useTextEditor,
  TextEditorProvider,
  TextEditorContent,
  TextEditorToolbar
} from '@opencloud-eu/web-pkg/editor'

const {
  currentContent,
  parsedContentType,
  isReadOnly = false,
  collaboration = undefined
} = defineProps<{
  currentContent: string
  parsedContentType: ContentType
  isReadOnly?: boolean
  collaboration?: TextEditorCollaborationOptions
}>()

const emit = defineEmits<{
  (e: 'update:currentContent', value: string): void
}>()

const textEditor = useTextEditor({
  contentType: parsedContentType,
  modelValue: toRef(() => currentContent),
  readonly: isReadOnly,
  onUpdate: (content) => emit('update:currentContent', content),
  collaboration
})
</script>
