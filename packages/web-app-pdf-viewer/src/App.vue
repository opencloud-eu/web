<template>
  <pdf-viewer
    :key="resource.id"
    :resource="resource"
    :current-content="currentContent"
    :is-read-only="isReadOnly"
    :is-dirty="isDirty"
    :current-file-context="currentFileContext"
    @update:current-content="emit('update:currentContent', $event)"
    @register:on-save-callback="emit('register:onSaveCallback', $event)"
    @register:on-flush-content-callback="emit('register:onFlushContentCallback', $event)"
  />
</template>

<script lang="ts">
import { defineAsyncComponent } from 'vue'
import { AppLoadingSpinner } from '@opencloud-eu/web-pkg'

// AppWrapper inspects the props and emits of this component to decide what to load and
// whether the app is an editor, so it has to be available synchronously. PDF.js and its
// stylesheet are big though, and are only pulled in once a PDF actually gets opened.
// Defined once for the module: inside setup, the loader would keep the first file in memory.
const PdfViewer = defineAsyncComponent({
  loader: () => import('./components/PdfViewer.vue'),
  loadingComponent: AppLoadingSpinner
})
</script>

<script setup lang="ts">
import type { Resource } from '@opencloud-eu/web-client'
import type { FileContext } from '@opencloud-eu/web-pkg'

const { resource, currentContent, isReadOnly, isDirty, currentFileContext } = defineProps<{
  resource: Resource
  currentContent: ArrayBuffer
  isReadOnly: boolean
  isDirty: boolean
  /** Where the file was opened from, to close the app. */
  currentFileContext: FileContext
}>()

const emit = defineEmits<{
  'update:currentContent': [content: ArrayBuffer]
  /** AppWrapper calls it after each of its saves, see usePdfChangeTracking. */
  'register:onSaveCallback': [callback: () => Promise<void>]
  /** AppWrapper calls it before each of its saves, see usePdfChangeTracking. */
  'register:onFlushContentCallback': [callback: () => Promise<void>]
}>()
</script>
