<template>
  <node-view-wrapper class="text-editor-html-block">
    <span class="text-editor-html-block-label" contenteditable="false">
      <oc-icon name="html5" size="xsmall" fill-type="line" />
      {{ $gettext('HTML') }}
    </span>
    <span :id="hintId" class="sr-only" contenteditable="false">
      {{
        $gettext('Press Shift+Enter or press Enter three times in a row to exit the HTML block.')
      }}
    </span>
    <pre
      class="text-editor-html-block-content"
      role="textbox"
      :aria-describedby="hintId"
      aria-multiline="true"
    ><code><node-view-content /></code></pre>
  </node-view-wrapper>
</template>

<script setup lang="ts">
import { NodeViewContent, nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'
import { useGettext } from 'vue3-gettext'
import { v4 as uuidV4 } from 'uuid'

defineProps(nodeViewProps)
const { $gettext } = useGettext()

const hintId = `html-block-hint-${uuidV4()}`
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
