<template>
  <slot v-if="loading" name="loading">
    <loading-screen />
  </slot>
  <slot v-else-if="loadingError" name="error" :error="loadingError">
    <error-screen :message="loadingError.message" />
  </slot>
  <slot
    v-else
    :extension="extension"
    :bindings="editorBindings"
    :resource="resource"
    :space="space"
    :url="url"
    :current-content="currentContent"
    :is-dirty="isDirty"
    :is-editor="isEditor"
    :is-read-only="effectiveIsReadOnly"
    :save="save"
    :close="closeApp"
  >
    <component :is="extension.component" v-bind="editorBindings" />
  </slot>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import type { Resource, SpaceResource } from '@opencloud-eu/web-client'

import ErrorScreen from './PartialViews/ErrorScreen.vue'
import LoadingScreen from './PartialViews/LoadingScreen.vue'
import { useResourceEditor, type ResourceEditorExtension } from '../../composables'

const { resource, space, extension, readOnly, onClose, onResourceUpdate } = defineProps<{
  resource: Resource
  space: SpaceResource
  extension: ResourceEditorExtension
  readOnly?: boolean
  onClose?: () => void
  onResourceUpdate?: (resource: Resource) => void
}>()

const {
  url,
  currentContent,
  isDirty,
  isEditor,
  isReadOnly,
  loading,
  loadingError,
  applicationConfig,
  currentFileContext,
  activeFiles,
  isFolderLoading,
  save,
  closeApp,
  getUrlForResource,
  revokeUrl,
  loadFolderForFileContext,
  setCurrentContent,
  setResource,
  registerOnDeleteResourceCallback
} = useResourceEditor({
  extension: () => extension,
  resource: () => resource,
  space: () => space,
  onClose,
  onResourceUpdate
})

const effectiveIsReadOnly = computed(() => readOnly || unref(isReadOnly))

defineExpose({
  isDirty,
  isEditor,
  isReadOnly: effectiveIsReadOnly,
  loading,
  loadingError,
  save,
  close: closeApp
})

const editorBindings = computed(() => ({
  url: unref(url),
  space,
  resource,
  activeFiles: unref(activeFiles),
  isDirty: unref(isDirty),
  isReadOnly: unref(effectiveIsReadOnly),
  applicationConfig: unref(applicationConfig),
  currentFileContext: unref(currentFileContext),
  currentContent: unref(currentContent),
  isFolderLoading: unref(isFolderLoading),

  'onUpdate:resource': setResource,
  'onUpdate:currentContent': setCurrentContent,
  'onRegister:onDeleteResourceCallback': registerOnDeleteResourceCallback,

  onSave: save,
  onClose: closeApp,
  loadFolderForFileContext,
  revokeUrl,
  getUrlForResource
}))
</script>
