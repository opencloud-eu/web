<script setup lang="ts">
import { inject, type ComputedRef, type PropType } from 'vue'
import type * as Y from 'yjs'
import type { Awareness } from 'y-protocols/awareness'
import type { HocuspocusProvider } from '@hocuspocus/provider'
import {
  useTextEditor,
  TextEditorProvider,
  TextEditorContent,
  TextEditorToolbar,
  type ContentType
} from '@opencloud-eu/web-pkg/editor'

// The CollaborativeWrapper mounts this component once its Y.Doc + Awareness
// are ready (collab-mode after `onSynced`, local-mode immediately). The
// editor is bound to the shared Y.Doc through `@tiptap/extension-collaboration`
// inside `useTextEditor`; the strategy controls everything else (extensions,
// serialise/deserialise, toolbar actions, slash commands).
//
// `contentType` is the only piece the wrapper has no view of — the parent
// (App.vue) provides it via inject because adding it to the wrapper's
// editor-prop signature would couple the editor-agnostic wrapper to
// text-editor specifics.
const props = defineProps({
  ydoc: { type: Object as PropType<Y.Doc>, required: true },
  awareness: { type: Object as PropType<Awareness>, required: true },
  provider: {
    type: Object as PropType<HocuspocusProvider | null>,
    required: false,
    default: null
  },
  isReadOnly: { type: Boolean, default: false }
})

const contentType = inject<ComputedRef<ContentType>>('textEditorContentType')!
const placeholder = inject<ComputedRef<string | undefined>>('textEditorPlaceholder', undefined)

const textEditor = useTextEditor({
  contentType: contentType.value,
  readonly: props.isReadOnly,
  ydoc: props.ydoc,
  awareness: props.awareness,
  placeholder: placeholder?.value
})

// The wrapper reads this through a template ref and forwards the live
// editor into `adapter.serialize(ydoc, context)`. The adapter then
// short-circuits its headless-editor spawn — avoiding a fresh Tiptap
// instance per keystroke.
defineExpose({
  getAdapterContext: () => ({ editor: textEditor.editor.value })
})
</script>

<template>
  <div class="oc-text-editor size-full" :class="{ 'overflow-auto': isReadOnly }">
    <TextEditorProvider :editor="textEditor">
      <TextEditorToolbar v-if="!isReadOnly" />
      <TextEditorContent />
    </TextEditorProvider>
  </div>
</template>
