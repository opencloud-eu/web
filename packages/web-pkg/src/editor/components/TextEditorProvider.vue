<template>
  <div class="text-editor-provider h-full flex flex-col">
    <slot />
    <TextEditorLinkPanel :editor="editor" :teleport="teleport" />
  </div>
</template>

<script setup lang="ts">
import { provide } from 'vue'
import type { TextEditorInstance } from '../types'
import TextEditorLinkPanel from './TextEditorLinkPanel.vue'

const props = defineProps<{
  editor: TextEditorInstance
  /**
   * Where the link panel teleports to. Defaults to the body.
   */
  teleport?: string
}>()

provide('textEditor', props.editor)
</script>
