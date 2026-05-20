<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch, type PropType } from 'vue'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type * as Y from 'yjs'
import type { Awareness } from 'y-protocols/awareness'
import ExcalidrawCanvas from './react_app/ExcalidrawCanvas'

// The CollaborativeWrapper hands us `ydoc` + `awareness` (collab or local
// mode) and rebuilds them when the file identity changes (navigation
// between two .excalidraw files without app teardown — e.g. opening a
// link from search, switching between routes). We mount Excalidraw — a
// React-only component — via vanilla React 18+ `createRoot` and re-render
// whenever those props change.
//
// We bypass the veaury Vue<->React bridge because veaury 2.6.x breaks on
// React 19 ("S is not a function" inside __veauryMountReactComponent__).
// Worth revisiting later: if veaury (or an alternative bridge) catches up
// to React 19, the bidirectional reactivity is a nicer fit than this
// manual re-render dance.
const props = defineProps({
  ydoc: { type: Object as PropType<Y.Doc>, required: true },
  awareness: { type: Object as PropType<Awareness>, required: true },
  isReadOnly: { type: Boolean, default: false }
})

const containerRef = ref<HTMLElement | null>(null)
let root: Root | null = null

const renderReact = () => {
  if (!root) return
  root.render(
    createElement(ExcalidrawCanvas, {
      ydoc: props.ydoc,
      awareness: props.awareness,
      isReadOnly: props.isReadOnly
    })
  )
}

onMounted(() => {
  if (!containerRef.value) return
  root = createRoot(containerRef.value)
  renderReact()
})

// Identity-based watch: only re-renders when ydoc / awareness are
// actually different objects (file navigation rebuilds them via the
// wrapper's sessionKey), not on every reactive tick. isReadOnly toggles
// re-render too so view-mode flips propagate.
watch(
  () => [props.ydoc, props.awareness, props.isReadOnly],
  () => renderReact()
)

onBeforeUnmount(() => {
  root?.unmount()
  root = null
})
</script>

<template>
  <div class="oc-excalidraw size-full">
    <div ref="containerRef" class="oc-excalidraw__react-host" />
  </div>
</template>

<style>
.oc-excalidraw,
.oc-excalidraw__react-host,
.oc-excalidraw__react-host .excalidraw-host {
  width: 100%;
  height: 100%;
}
</style>
