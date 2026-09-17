<template>
  <TextEditorContent :editor="editor" />
</template>

<script setup lang="ts">
import { toRef } from 'vue'
import TextEditorContent from './TextEditorContent.vue'
import { useTextEditor } from '../composables'
import type { ContentType } from '../types'

const {
  content = '',
  contentType = 'markdown',
  ariaLabel = undefined
} = defineProps<{
  content?: string
  contentType?: ContentType
  ariaLabel?: string
}>()

const editor = useTextEditor({
  contentType,
  modelValue: toRef(() => content),
  ariaLabel,
  readonly: true,
  slashCommands: false
})
</script>
