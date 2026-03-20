<template>
  <EditorContent
    v-if="textEditor.editor.value"
    class="text-editor-content"
    :editor="textEditor.editor.value"
  />
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { EditorContent } from '@tiptap/vue-3'
import type { TextEditorInstance } from '../types'

const textEditor = inject<TextEditorInstance>('textEditor')!
</script>

<style>
@import '../styles/content.css';
</style>
