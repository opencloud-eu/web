<template>
  <div
    v-if="textEditor.editor.value"
    class="text-editor-content h-full"
    :style="{
      '--text-editor-zoom-factor': zoomFactor
    }"
  >
    <DragHandle
      v-if="!isSourceMode"
      :editor="textEditor.editor.value"
      @node-change="onDragHandleNodeChange"
    >
      <div class="flex items-center gap-1 mr-1 mt-[0.125rem]">
        <oc-button
          v-if="hasSlashCommands"
          appearance="raw"
          class="drag-handle-plus-button"
          :aria-label="$gettext('Add content')"
          @click="openSlashMenu"
        >
          <oc-icon name="add" />
        </oc-button>
        <oc-button
          appearance="raw"
          class="custom-drag-handle cursor-grab!"
          :aria-label="$gettext('Drag to move')"
        >
          <oc-icon name="draggable" fill-type="none" />
        </oc-button>
      </div>
    </DragHandle>
    <TextEditorTableBubbleMenu v-if="!isSourceMode" />
    <EditorContent v-show="!isSourceMode" :editor="textEditor.editor.value" class="h-full" />
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
import { DragHandle } from '@tiptap/extension-drag-handle-vue-3'
import { useGettext } from 'vue3-gettext'
import TextEditorTableBubbleMenu from './TextEditorTableBubbleMenu.vue'
import type { TextEditorInstance } from '../types'

const { editor = undefined } = defineProps<{
  editor?: TextEditorInstance
}>()

const { $gettext } = useGettext()
const textEditor = editor || inject<TextEditorInstance>('textEditor')!
const sourceContent = ref('')
const sourceModeTextareaRef = useTemplateRef<HTMLTextAreaElement>('sourceModeTextarea')
const currentDragHandleNodePos = ref<number | null>(null)

const isSourceMode = computed(() => unref(textEditor.state.sourceMode))
const zoomFactor = computed(() => {
  return `${(unref(textEditor.state.editorZoom) || 100) / 100}`
})

const hasSlashCommands = computed(() => {
  const editor = unref(textEditor.editor)
  if (!editor) {
    return false
  }
  return editor.extensionManager.extensions.some((ext) => ext.name === 'slashCommands')
})

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

const onDragHandleNodeChange = ({ pos }: { pos: number }) => {
  currentDragHandleNodePos.value = pos
}

const openSlashMenu = () => {
  if (!textEditor.editor.value) {
    return
  }

  // Use the position from the drag handle's current node
  if (currentDragHandleNodePos.value !== null) {
    const pos = currentDragHandleNodePos.value
    const node = textEditor.editor.value.state.doc.nodeAt(pos)

    if (node) {
      // Check if node has content
      const hasContent = node.content.size > 0

      if (hasContent) {
        // Insert new line after the node
        const afterPos = pos + node.nodeSize
        textEditor.editor.value
          .chain()
          .focus()
          .insertContentAt(afterPos, { type: 'paragraph' })
          .setTextSelection(afterPos + 1)
          .insertContent('/')
          .run()
      } else {
        // Node is empty, insert at the beginning
        textEditor.editor.value
          .chain()
          .focus()
          .setTextSelection(pos + 1)
          .insertContent('/')
          .run()
      }
    }
  } else {
    // Fallback: insert at current position
    textEditor.editor.value.commands.insertContent('/')
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
