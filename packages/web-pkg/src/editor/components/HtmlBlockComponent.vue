<template>
  <node-view-wrapper class="text-editor-html-block">
    <span class="text-editor-html-block-label" contenteditable="false">
      <oc-icon name="html5" size="xsmall" fill-type="line" />
      {{ $gettext('HTML') }}
    </span>
    <pre class="text-editor-html-block-content"><code><node-view-content /></code></pre>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { NodeViewContent, nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
import { useGettext } from 'vue3-gettext'

defineProps(nodeViewProps)
const { $gettext } = useGettext()
</script>

<style scoped>
.text-editor-html-block-label {
  position: absolute;
  right: 12px;
  top: 4px;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 12px;
  color: var(--oc-role-on-surface-variant);
  user-select: none;
}

.text-editor-html-block-content {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
