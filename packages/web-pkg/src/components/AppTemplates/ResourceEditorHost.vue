<template>
  <slot v-if="loading" name="loading">
    <loading-screen />
  </slot>
  <slot v-else-if="loadingError" name="error" :error="loadingError">
    <error-screen :message="loadingError.message" />
  </slot>
  <!--
    Default-slot contract: callers receive `bindings` (the full v-bind blob
    you'd pass to extension.component) plus convenience refs unwrapped for
    common state. Use `bindings` when forwarding to the editor as-is; pick
    individual refs when wrapping conditionally.
  -->
  <slot
    v-else
    :bindings="editorBindings"
    :resource="resource"
    :space="space"
    :url="url"
    :current-content="currentContent"
    :is-dirty="isDirty"
    :is-read-only="isReadOnly"
    :is-folder-loading="isFolderLoading"
    :active-files="activeFiles"
    :save="save"
    :close="closeApp"
  >
    <component :is="extension.component" v-bind="editorBindings" />
  </slot>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import ErrorScreen from './PartialViews/ErrorScreen.vue'
import LoadingScreen from './PartialViews/LoadingScreen.vue'
import { useResourceEditor, type ResourceEditorExtension } from '../../composables'

/**
 * Lightweight host that mounts a ResourceEditorExtension's component without
 * the route-bound UI (no TopBar, no FileSideBar, no onBeforeRouteLeave guard).
 * Intended for embedded use — e.g. previewing a file inside a sidebar panel,
 * a sharing dialog, or alongside an editor.
 *
 * Today this host still relies on useResourceEditor's route-mode (the
 * composable reads driveAliasAndItem / fileId from the current route), so
 * embedding only works inside a route context that already supplies those.
 * Property-driven embedding (`<ResourceEditorHost :resource="r" .../>`) is a
 * planned follow-up.
 */
const { extension } = defineProps<{
  extension: ResourceEditorExtension
}>()

const {
  resource,
  space,
  url,
  currentContent,
  isDirty,
  isReadOnly,
  loading,
  loadingError,
  applicationConfig,
  currentFileContext,
  activeFiles,
  isFolderLoading,
  save,
  closeApp,
  loadFolderForFileContext,
  getUrlForResource,
  revokeUrl,
  setCurrentContent,
  setResource,
  registerOnDeleteResourceCallback
} = useResourceEditor({ extension: () => extension })

const editorBindings = computed(() => ({
  url: unref(url),
  space: unref(space),
  resource: unref(resource),
  activeFiles: unref(activeFiles),
  isDirty: unref(isDirty),
  isReadOnly: unref(isReadOnly),
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
