<template>
  <div class="oc-text-editor size-full" :class="{ 'overflow-auto': isReadOnly }">
    <TextEditorProvider :editor="textEditor">
      <TextEditorToolbar v-if="!isReadOnly" />
      <TextEditorContent />
    </TextEditorProvider>
  </div>
</template>

<script setup lang="ts">
import { computed, toRef, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import type * as Y from 'yjs'
import type { Awareness } from 'y-protocols/awareness'
import {
  useTextEditor,
  TextEditorProvider,
  TextEditorContent,
  TextEditorToolbar,
  type ContentType
} from '@opencloud-eu/web-pkg/editor'
import type { Resource } from '@opencloud-eu/web-client'
import { detectContentType } from './collab'

// AppWrapper keeps its loading screen up until the collaborative session has
// synced and hydrated, so `ydoc` and `awareness` are ready by the time this
// component mounts. The editor binds to the shared Y.Doc through
// `@tiptap/extension-collaboration` inside `useTextEditor`; the strategy
// controls everything else (extensions, serialise/deserialise, toolbar
// actions, slash commands).
const {
  ydoc,
  awareness,
  contentType = undefined,
  isReadOnly = false,
  resource
} = defineProps<{
  ydoc: Y.Doc
  awareness: Awareness
  /**
   * Declared so AppWrapper fetches the file — the collaborative session reads
   * it to seed an empty Y.Doc. Never rendered directly: once the session is up
   * the Y.Doc is the source of truth.
   */
  currentContent: string
  contentType?: ContentType
  isReadOnly?: boolean
  resource: Resource
}>()

const { $gettext } = useGettext()

const parsedContentType = computed<ContentType>(() => {
  return contentType ?? detectContentType(resource)
})

const placeholder = computed(() => {
  if (isReadOnly || unref(parsedContentType) !== 'markdown') {
    return undefined
  }
  return $gettext('Write or type / for formatting options...')
})

const textEditor = useTextEditor({
  contentType: unref(parsedContentType),
  currentResource: toRef(() => resource),
  readonly: isReadOnly,
  placeholder: unref(placeholder),
  ydoc,
  awareness
})
</script>
