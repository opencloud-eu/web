<template>
  <div
    v-if="visible"
    class="text-editor-toolbar flex items-center gap-3 border-b border-b-role-border overflow-x-auto"
  >
    <div
      v-for="(group, groupIndex) in toolbarGroups"
      :key="groupIndex"
      class="text-editor-toolbar-group inline-flex items-stretch"
      :class="{ 'border-l border-l-role-border pl-3': groupIndex > 0 }"
    >
      <oc-button
        v-for="item in group"
        :key="item.id"
        type="button"
        appearance="raw"
        class="text-editor-toolbar-btn min-w-[42px] h-[35px] px-[11px] inline-flex items-center justify-center"
        :class="{ 'text-editor-toolbar-btn--active': item.isActive(textEditor.editor.value!) }"
        :aria-label="item.label"
        :disabled="!isItemEnabled(item)"
        @click.stop="item.action(textEditor.editor.value!)"
      >
        <oc-icon :name="item.icon" fill-type="none" size="small" />
      </oc-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref, unref, watch } from 'vue'
import type { TextEditorInstance } from '../types'

const textEditor = inject<TextEditorInstance>('textEditor')!

const visible = computed(() => {
  if (unref(textEditor.readonly)) {
    return false
  }
  if (unref(textEditor.contentType) === 'plain-text') {
    return false
  }
  return !!unref(textEditor.editor)
})

// Track editor state changes to trigger reactivity
const editorStateKey = ref(0)

watch(
  () => unref(textEditor.editor),
  (editor, oldEditor) => {
    if (oldEditor) {
      oldEditor.off('selectionUpdate', updateEditorState)
      oldEditor.off('transaction', updateEditorState)
    }
    if (editor) {
      editor.on('selectionUpdate', updateEditorState)
      editor.on('transaction', updateEditorState)
    }
  },
  { immediate: true }
)

function updateEditorState() {
  editorStateKey.value++
}

const toolbarGroups = computed(() => {
  return textEditor.toolbarItems.filter((group) => group.length > 0)
})

function isItemEnabled(item: any) {
  // Access editorStateKey to make this reactive to editor state changes
  editorStateKey.value

  const editor = unref(textEditor.editor)
  if (!editor) {
    return false
  }

  if (item.isEnabled) {
    return item.isEnabled(editor)
  }
  return true
}
</script>
