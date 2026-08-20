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

const { ydoc, awareness, isReadOnly, resource } = defineProps<YjsEditorSlotProps>()

const { $gettext } = useGettext()

const contentType = computed<ContentType>(() => {
  return detectContentType(resource)
})

const placeholder = computed(() => {
  if (isReadOnly || !['markdown', 'tiptap-json'].includes(unref(contentType))) {
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
