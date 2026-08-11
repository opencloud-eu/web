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
import type { YjsEditorSlotProps } from '@opencloud-eu/web-pkg'
import {
  useTextEditor,
  TextEditorProvider,
  TextEditorContent,
  TextEditorToolbar,
  type ContentType
} from '@opencloud-eu/web-pkg/editor'
import { detectContentType } from './yjs'

// AppWrapper keeps its loading screen up until the Yjs session has
// synced and hydrated, so `ydoc` and `awareness` are ready by the time this
// component mounts. The editor binds to the shared Y.Doc through
// `@tiptap/extension-collaboration` inside `useTextEditor`.
// `currentContent` is declared by `YjsEditorSlotProps` but never read
// here. It makes AppWrapper fetch the file, which the Yjs session
// uses to seed an empty Y.Doc. Once the session is up the Y.Doc is the source
// of truth.
const { ydoc, awareness, isReadOnly, resource } = defineProps<YjsEditorSlotProps>()

const { $gettext } = useGettext()

const contentType = computed<ContentType>(() => {
  return detectContentType(resource)
})

const placeholder = computed(() => {
  if (isReadOnly || unref(contentType) !== 'markdown') {
    return undefined
  }
  return $gettext('Write or type / for formatting options...')
})

const textEditor = useTextEditor({
  contentType: unref(contentType),
  currentResource: toRef(() => resource),
  readonly: () => isReadOnly,
  placeholder: unref(placeholder),
  ydoc,
  awareness
})
</script>
