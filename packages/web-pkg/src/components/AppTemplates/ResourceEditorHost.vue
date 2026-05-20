<template>
  <slot v-if="!resolvedExtension" name="no-editor" :resource="resource">
    <p class="resource-editor-host__no-editor text-role-on-surface-muted p-4 text-center">
      {{ $gettext('No preview available for this file.') }}
    </p>
  </slot>
  <slot v-else-if="loading" name="loading">
    <loading-screen />
  </slot>
  <slot v-else-if="loadingError" name="error" :error="loadingError">
    <error-screen :message="loadingError.message" />
  </slot>
  <slot
    v-else
    :extension="resolvedExtension"
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
    <component :is="resolvedExtension.component" v-bind="editorBindings" />
  </slot>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { Resource, SpaceResource } from '@opencloud-eu/web-client'

import ErrorScreen from './PartialViews/ErrorScreen.vue'
import LoadingScreen from './PartialViews/LoadingScreen.vue'
import { resolveResourceEditor } from './resolveResourceEditor'
import {
  useExtensionRegistry,
  useResourceEditor,
  type ResourceEditorExtension
} from '../../composables'

/**
 * Embed-host for resourceEditor extensions. Mounts the registered editor
 * for a given resource without route-bound UI (no TopBar, no FileSideBar,
 * no `onBeforeRouteLeave` guard).
 *
 * Extension resolution: `extension` prop wins, then `extensionId`, then
 * auto-resolve via `resource.extension` / `resource.mimeType` /
 * `extension.matches()` against the registry.
 */
const { resource, space, extension, extensionId, readOnly, onClose, onResourceUpdate } =
  defineProps<{
    resource: Resource
    space: SpaceResource
    extension?: ResourceEditorExtension
    extensionId?: string
    /** Force read-only regardless of the resource's webdav permissions. */
    readOnly?: boolean
    onClose?: () => void
    onResourceUpdate?: (resource: Resource) => void
  }>()

const { $gettext } = useGettext()
const { requestExtensions } = useExtensionRegistry()

// resourceEditor extensions don't declare `extensionPointIds`, so the
// registry matches them against any lookup id; this one is just bookkeeping.
const RESOURCE_EDITOR_LOOKUP_ID = 'app.resource-editor.host'

const resolvedExtension = computed<ResourceEditorExtension | undefined>(() => {
  if (extension) return extension
  const candidates =
    requestExtensions<ResourceEditorExtension>({
      id: RESOURCE_EDITOR_LOOKUP_ID,
      extensionType: 'resourceEditor'
    }) ?? []
  if (extensionId) return candidates.find((e) => e.id === extensionId)
  return resolveResourceEditor(resource, candidates)
})

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
  extension: () => resolvedExtension.value!,
  resource: () => resource,
  space: () => space,
  onClose,
  onResourceUpdate
})

const effectiveIsReadOnly = computed(() => readOnly || unref(isReadOnly))

// Component-ref API for parents that don't use the default slot. Mirrors
// the slot's bindings.
defineExpose({
  isDirty,
  isEditor,
  isReadOnly: effectiveIsReadOnly,
  resolvedExtension,
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
