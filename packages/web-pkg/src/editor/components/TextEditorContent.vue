<template>
  <div v-if="textEditor.editor.value" class="text-editor-content h-full">
    <EditorContent v-show="!isSourceMode" :editor="textEditor.editor.value" />
    <div v-if="isSourceMode" class="flex size-full justify-center">
      <textarea
        ref="sourceModeTextarea"
        :value="sourceContent"
        class="w-full max-w-[800px] p-[1rem] resize-none border-0 focus:outline-none"
        @input="onSourceInput"
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

const isSourceMode = computed(() => unref(textEditor.state.sourceMode))

const onSourceInput = (event: Event) => {
  const value = (event.target as HTMLTextAreaElement).value
  sourceContent.value = value

  const contentType = unref(textEditor.contentType)

  if (contentType === 'html' || contentType === 'markdown') {
    textEditor.editor.value?.commands.setContent(value, { contentType, emitUpdate: true })
  } else {
    textEditor.editor.value?.commands.setContent(value, { emitUpdate: true })
  }
}

watch(isSourceMode, async () => {
  if (unref(isSourceMode)) {
    sourceContent.value = textEditor.getContent()
    await nextTick()
    sourceModeTextareaRef.value?.focus()
    sourceModeTextareaRef.value?.setSelectionRange(0, 0)
    sourceModeTextareaRef.value?.scrollTo(0, 0)
    return
  }
})
</script>

<style>
@import '../styles/content.css';
</style>
