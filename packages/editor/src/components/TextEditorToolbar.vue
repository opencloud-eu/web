<template>
  <div v-if="visible" class="text-editor-toolbar inline-flex items-center gap-3">
    <div
      v-for="(group, groupIndex) in textEditor.toolbarItems"
      :key="groupIndex"
      class="text-editor-toolbar-group inline-flex items-stretch rounded-lg overflow-hidden bg-role-surface-variant"
    >
      <oc-button
        v-for="item in group"
        :key="item.id"
        type="button"
        appearance="raw"
        class="text-editor-toolbar-btn min-w-[42px] h-[35px] px-[11px] inline-flex items-center justify-center"
        :class="{ 'text-editor-toolbar-btn--active': item.isActive(textEditor.editor.value!) }"
        :aria-label="item.label"
        @click.stop="item.action(textEditor.editor.value!)"
      >
        <oc-icon :name="item.icon" fill-type="none" size="small" />
      </oc-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import type { TextEditorInstance } from '../types'

const textEditor = inject<TextEditorInstance>('textEditor')!

const visible = computed(() => {
  if (textEditor.readonly.value) return false
  if (textEditor.contentType.value === 'plain-text') return false
  return !!textEditor.editor.value
})
</script>
