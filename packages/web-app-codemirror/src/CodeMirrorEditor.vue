<script setup lang="ts">
import { shallowRef, watchEffect, type PropType } from 'vue'
import type * as Y from 'yjs'
import type { Awareness } from 'y-protocols/awareness'
import { EditorState } from '@codemirror/state'
import { EditorView, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { markdown } from '@codemirror/lang-markdown'
import { yCollab } from 'y-codemirror.next'

const props = defineProps({
  ydoc: { type: Object as PropType<Y.Doc>, required: true },
  awareness: { type: Object as PropType<Awareness>, required: true },
  isReadOnly: { type: Boolean, default: false }
})

const editorRef = shallowRef<HTMLDivElement | null>(null)
const editorView = shallowRef<EditorView | null>(null)

watchEffect((onCleanup) => {
  const doc = props.ydoc
  const aw = props.awareness
  const parent = editorRef.value
  if (!doc || !aw || !parent) return

  const yText = doc.getText('content')
  const state = EditorState.create({
    doc: yText.toString(),
    extensions: [
      lineNumbers(),
      highlightActiveLine(),
      markdown(),
      yCollab(yText, aw),
      EditorView.editable.of(!props.isReadOnly)
    ]
  })

  const view = new EditorView({ state, parent })
  editorView.value = view

  onCleanup(() => {
    view.destroy()
    if (editorView.value === view) editorView.value = null
  })
})
</script>

<template>
  <div ref="editorRef" class="oc-width-1-1 oc-height-1-1 cm-host"></div>
</template>

<style scoped>
.cm-host {
  overflow: auto;
}
</style>
