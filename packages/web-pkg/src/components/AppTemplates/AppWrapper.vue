<template>
  <resource-editor-route-host :extension="syntheticExtension" />
</template>

<script setup lang="ts">
import { computed, defineComponent } from 'vue'
import ResourceEditorRouteHost from './ResourceEditorRouteHost.vue'
import type { Resource } from '@opencloud-eu/web-client'
import {
  type FileContentOptions,
  type UrlForResourceOptions,
  type ResourceEditorComponent,
  type ResourceEditorExtension
} from '../../composables'

/**
 * @deprecated Backwards-compat shim. New code should use
 * {@link resourceEditorRoute} with a typed `resourceEditor` extension.
 */
const {
  applicationId,
  urlForResourceOptions = null,
  fileContentOptions = null,
  wrappedComponent = null,
  importResourceWithExtension = () => null,
  disableAutoSave = false
} = defineProps<{
  applicationId: string
  urlForResourceOptions?: UrlForResourceOptions | null
  fileContentOptions?: FileContentOptions | null
  wrappedComponent?: ReturnType<typeof defineComponent> | null
  importResourceWithExtension?: (resource: Resource) => string | null
  disableAutoSave?: boolean
}>()

if (import.meta.env.DEV) {
  warnDeprecated(applicationId)
}

if (!wrappedComponent) {
  throw new Error(
    `[opencloud-eu/web-pkg] <AppWrapper applicationId="${applicationId}"> requires \`wrappedComponent\`. ` +
      `New apps should use \`resourceEditorRoute({ extension })\` directly.`
  )
}

const syntheticExtension = computed<ResourceEditorExtension>(() => ({
  id: `legacy.app-wrapper.${applicationId}`,
  type: 'resourceEditor',
  appId: applicationId,
  component: wrappedComponent as unknown as ResourceEditorComponent,
  urlForResourceOptions: urlForResourceOptions ?? undefined,
  fileContentOptions: fileContentOptions ?? undefined,
  importResourceWithExtension,
  disableAutoSave
}))
</script>

<script lang="ts">
const warnedApps = new Set<string>()
function warnDeprecated(appId: string) {
  if (warnedApps.has(appId)) return
  warnedApps.add(appId)
  // eslint-disable-next-line no-console
  console.warn(
    `[opencloud-eu/web-pkg] AppWrapper / AppWrapperRoute are deprecated. ` +
      `Migrate "${appId}" to a 'resourceEditor' extension and resourceEditorRoute().`
  )
}
</script>
