<template>
  <div class="oc-text-editor size-full" :class="{ 'p-4 overflow-auto': isReadOnly }">
    <TextEditorProvider :editor="textEditor">
      <TextEditorToolbar v-if="!isReadOnly" />
      <TextEditorContent />
    </TextEditorProvider>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  useTextEditor,
  TextEditorProvider,
  TextEditorContent,
  TextEditorToolbar
} from '@opencloud-eu/editor'
import type { ContentType } from '@opencloud-eu/editor'
import type { Resource } from '@opencloud-eu/web-client'

const props = defineProps<{
  currentContent: string
  isReadOnly?: boolean
  resource: Resource
}>()

const emit = defineEmits<{
  (e: 'update:currentContent', value: string): void
}>()

const contentType = computed<ContentType>(() => {
  const ext = props.resource?.extension?.toLowerCase()
  if (ext === 'md' || ext === 'markdown') return 'markdown'
  return 'plain-text'
})

// contentType.value is a snapshot — the editor is created once per component mount.
// This is fine because the text-editor app remounts App.vue for each file.
const textEditor = useTextEditor({
  contentType: contentType.value,
  modelValue: props.currentContent,
  readonly: props.isReadOnly,
  onUpdate: (content) => emit('update:currentContent', content)
})
</script>
