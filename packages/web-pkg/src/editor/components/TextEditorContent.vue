<template>
  <EditorContent
    v-if="textEditor.editor.value"
    class="text-editor-content"
    :class="{ 'markdown-source-mode': isMarkdownSourceMode }"
    :editor="textEditor.editor.value"
  />
</template>

<script setup lang="ts">
import { computed, inject, unref } from 'vue'
import { EditorContent } from '@tiptap/vue-3'
import type { TextEditorInstance } from '../types'

const textEditor = inject<TextEditorInstance>('textEditor')!

const isMarkdownSourceMode = computed(
  () => unref(textEditor.contentType) === 'markdown' && unref(textEditor.state.sourceMode)
)
</script>

<style>
@import '../styles/content.css';
</style>
