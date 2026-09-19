<template>
  <div class="text-editor-source-view flex size-full justify-center">
    <textarea
      ref="sourceTextarea"
      :value="sourceContent"
      :readonly="isSourceReadonly"
      :aria-label="isSourceReadonly ? $gettext('Source view, read-only') : $gettext('Source view')"
      class="w-full max-w-[800px] p-[1rem] resize-none border-0 focus:outline-none"
      :class="{ 'cursor-not-allowed': isSourceReadonly }"
      @input="onSourceInput"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref, unref, useTemplateRef } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { TextEditorInstance } from '../types'

const { editor = undefined } = defineProps<{
  editor?: TextEditorInstance
}>()

const { $gettext } = useGettext()

const textEditor = editor || inject<TextEditorInstance>('textEditor')!
const sourceTextareaRef = useTemplateRef<HTMLTextAreaElement>('sourceTextarea')
const sourceContent = ref(textEditor.getContent())

const isSourceReadonly = computed(() => unref(textEditor.state.sourceModeReadonly) ?? false)

function syncSourceContent() {
  sourceContent.value = textEditor.getContent()
}

function onSourceInput(event: Event) {
  if (unref(isSourceReadonly)) {
    return
  }

  const value = (event.target as HTMLTextAreaElement).value
  sourceContent.value = value

  const contentType = unref(textEditor.contentType)

  if (contentType === 'html' || contentType === 'markdown') {
    textEditor.editor.value?.commands.setContent(value, { contentType, emitUpdate: true })
  } else {
    textEditor.editor.value?.commands.setContent(value, { emitUpdate: true })
  }
}

onMounted(() => {
  sourceTextareaRef.value?.focus()
  sourceTextareaRef.value?.setSelectionRange(0, 0)
  sourceTextareaRef.value?.scrollTo(0, 0)

  // A Yjs document keeps changing underneath this view while peers type, so
  // follow it instead of showing the snapshot taken when it opened.
  if (!unref(textEditor.yjsActive)) {
    return
  }
  unref(textEditor.editor)?.on('update', syncSourceContent)
})

onBeforeUnmount(() => {
  unref(textEditor.editor)?.off('update', syncSourceContent)
})
</script>
