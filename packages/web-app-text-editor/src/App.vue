<template>
  <CollaborativeWrapper
    :resource="resource"
    :current-content="currentContent"
    :is-read-only="isReadOnly"
    :adapter="adapter"
    :editor="TextEditorBinding"
    :app-version="pkg.version"
    document-prefix="text-editor"
    :realtime-url="(applicationConfig?.realtimeUrl as string | null | undefined) ?? undefined"
    @update:current-content="$emit('update:currentContent', $event)"
  />
</template>

<script setup lang="ts">
import { computed, provide, ref, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { CollaborativeWrapper, type AppConfigObject } from '@opencloud-eu/web-pkg'
import { useContentStrategy, type ContentType } from '@opencloud-eu/web-pkg/editor'
import type { Resource } from '@opencloud-eu/web-client'
import { makeTextEditorAdapter } from './adapters/textEditorAdapter'
import TextEditorBinding from './TextEditorBinding.vue'
import pkg from '../package.json'

const props = defineProps<{
  applicationConfig?: AppConfigObject
  currentContent: string
  contentType?: ContentType
  isReadOnly?: boolean
  resource: Resource
}>()

defineEmits<{
  (e: 'update:currentContent', value: string): void
}>()

const { $gettext } = useGettext()

// Original heuristic: prefer the host-provided `contentType` prop, else
// derive from the file's extension / mime type. Unchanged from the pre-
// collab implementation.
const parsedContentType = computed<ContentType>(() => {
  if (props.contentType !== undefined) {
    return props.contentType
  }
  const ext = props.resource?.extension?.toLowerCase()
  const mimeType = props.resource?.mimeType?.toLowerCase()
  if (ext === 'md' || ext === 'markdown' || mimeType === 'text/markdown') {
    return 'markdown'
  }
  if (ext === 'html' || ext === 'htm' || mimeType === 'text/html') {
    return 'html'
  }
  return 'plain-text'
})

// Placeholder hint for the markdown writing experience. Re-introduced
// alongside the collab refactor (was on main directly inside
// `useTextEditor`); we now compute it here and hand it down to
// TextEditorBinding via inject, same channel as `contentType`.
const placeholder = computed(() => {
  if (props.isReadOnly || unref(parsedContentType) !== 'markdown') {
    return undefined
  }
  return $gettext('Write or type / for formatting options...')
})

// TextEditorBinding (mounted by CollaborativeWrapper once the Y.Doc is
// ready) reads these and feeds them into `useTextEditor`. Inject keeps
// the generic wrapper / editor-prop signature free of text-editor
// specifics.
provide('textEditorContentType', parsedContentType)
provide('textEditorPlaceholder', placeholder)

// CollaborativeWrapper's hydrate / serialize / hasContent / reset hooks
// run against this adapter. We rebuild it when `parsedContentType` changes
// (e.g. opening a different file with a different content type); the
// wrapper itself rebuilds the Y.Doc on `documentName` + `realtimeUrl`
// changes via its session key, which covers the navigation case.
const { resolveStrategy } = useContentStrategy()
const adapter = computed(() => {
  // useContentStrategy() requires the same `TextEditorState` shape
  // useTextEditor uses internally. We construct a private one here for the
  // adapter's headless-editor fallback path; the live editor inside
  // TextEditorBinding has its own state via its own useTextEditor call.
  const editorState = { sourceMode: ref(false) }
  return makeTextEditorAdapter(resolveStrategy(parsedContentType.value, editorState))
})
</script>
