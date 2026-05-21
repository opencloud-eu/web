<template>
  <slot v-if="!resolvedExtension" name="no-editor" :resource="resource">
    <p class="resource-editor-host__no-editor text-role-on-surface-muted p-4 text-center">
      {{ $gettext('No preview available for this file.') }}
    </p>
  </slot>
  <resource-editor-mount
    v-else
    ref="mount"
    :resource="resource"
    :space="space"
    :extension="resolvedExtension"
    :read-only="readOnly"
    :on-close="onClose"
    :on-resource-update="onResourceUpdate"
  >
    <template v-for="(_, name) in $slots" #[name]="scope">
      <slot :name="name" v-bind="scope || {}" />
    </template>
  </resource-editor-mount>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGettext } from 'vue3-gettext'
import type { Resource, SpaceResource } from '@opencloud-eu/web-client'

import ResourceEditorMount from './ResourceEditorMount.vue'
import { resolveResourceEditor } from './resolveResourceEditor'
import { useExtensionRegistry, type ResourceEditorExtension } from '../../composables'

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

// Forward the mount's exposed state so parents using `ref="host"` see
// the same surface regardless of whether an extension resolved.
const mount = ref<InstanceType<typeof ResourceEditorMount> | null>(null)
defineExpose({
  resolvedExtension,
  isDirty: computed(() => mount.value?.isDirty),
  isEditor: computed(() => mount.value?.isEditor),
  isReadOnly: computed(() => mount.value?.isReadOnly),
  loading: computed(() => mount.value?.loading),
  loadingError: computed(() => mount.value?.loadingError),
  save: () => mount.value?.save(),
  close: () => mount.value?.close()
})
</script>
