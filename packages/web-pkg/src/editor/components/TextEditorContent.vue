<template>
  <div v-if="textEditor.editor.value" class="text-editor-content h-full">
    <EditorContent
      v-show="!isMarkdownSourceMode"
      class="h-full"
      :editor="textEditor.editor.value"
    />
    <div v-if="isMarkdownSourceMode" class="flex h-full w-full justify-center p-4">
      <textarea
        ref="sourceModeTextarea"
        v-model="sourceContent"
        class="w-full max-w-4xl resize-none border-0 focus:outline-none"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, ref, unref, useTemplateRef, watch } from 'vue'
import { EditorContent } from '@tiptap/vue-3'
import type { TextEditorInstance } from '../types'

const { editor = undefined } = defineProps<{
  editor?: TextEditorInstance
}>()
const textEditor = editor || inject<TextEditorInstance>('textEditor')!
const sourceContent = ref('')
const sourceModeTextareaRef = useTemplateRef<HTMLTextAreaElement>('sourceModeTextarea')

const isMarkdownSourceMode = computed(
  () => unref(textEditor.contentType) === 'markdown' && unref(textEditor.state.sourceMode)
)

watch(isMarkdownSourceMode, async () => {
  if (unref(isMarkdownSourceMode)) {
    sourceContent.value = textEditor.getContent()
    await nextTick()
    sourceModeTextareaRef.value?.focus()
    sourceModeTextareaRef.value?.setSelectionRange(0, 0)
    sourceModeTextareaRef.value?.scrollTo(0, 0)
    return
  }

  textEditor.editor.value?.commands.setContent(sourceContent.value, {
    contentType: 'markdown',
    emitUpdate: true
  })
})
</script>

<style>
@import '../styles/content.css';
</style>
