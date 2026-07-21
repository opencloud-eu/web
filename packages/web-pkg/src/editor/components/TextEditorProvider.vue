<template>
  <div class="text-editor-provider h-full flex flex-col">
    <slot />
    <TextEditorLinkPanel :editor="editor" />
  </div>
</template>

<script setup lang="ts">
import { provide } from 'vue'
import type { TextEditorInstance } from '../types'
import TextEditorLinkPanel from './TextEditorLinkPanel.vue'

const { editor } = defineProps<{
  editor: TextEditorInstance
}>()

provide('textEditor', editor)
</script>
