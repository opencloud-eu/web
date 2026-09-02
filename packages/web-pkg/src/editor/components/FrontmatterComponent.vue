<template>
  <node-view-wrapper class="text-editor-frontmatter">
    <span class="text-editor-frontmatter-label" contenteditable="false">
      <oc-icon name="file-list-2" size="xsmall" fill-type="line" />
      {{ $gettext('Frontmatter') }}
    </span>
    <span :id="hintId" class="sr-only">
      {{
        $gettext(
          'Press Shift+Enter or press Enter three times in a row to exit the frontmatter block.'
        )
      }}
    </span>
    <pre
      class="text-editor-frontmatter-content font-mono"
      role="textbox"
      :aria-describedby="hintId"
      aria-multiline="true"
    ><node-view-content /></pre>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { NodeViewContent, nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
import { useGettext } from 'vue3-gettext'
import { v4 as uuidV4 } from 'uuid'

defineProps(nodeViewProps)
const { $gettext } = useGettext()
const hintId = `frontmatter-hint-${uuidV4()}`
</script>

<style scoped>
.text-editor-frontmatter-label {
  position: absolute;
  right: 8px;
  top: 4px;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 12px;
  color: var(--oc-role-on-surface-variant);
  user-select: none;
}

.text-editor-frontmatter-content {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
