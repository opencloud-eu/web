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
import type { Resource } from '@opencloud-eu/web-client'
import type { YjsStatus } from '@opencloud-eu/web-pkg'
import type * as Y from 'yjs'
import type { Awareness } from 'y-protocols/awareness'
import {
  useTextEditor,
  TextEditorProvider,
  TextEditorContent,
  TextEditorToolbar,
  type ContentType
} from '@opencloud-eu/web-pkg/editor'
import { detectContentType } from './yjs'

const { ydoc, awareness, isReadOnly, resource, yjsStatus } = defineProps<{
  currentContent: string
  isReadOnly: boolean
  resource: Resource
  ydoc: Y.Doc | null
  awareness: Awareness | null
  yjsStatus: YjsStatus | null
}>()

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
  awareness,
  yjsStatus: () => yjsStatus
})
</script>
