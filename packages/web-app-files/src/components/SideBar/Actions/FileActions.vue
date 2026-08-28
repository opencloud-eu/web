<template>
  <oc-list id="oc-files-actions-sidebar" class="sidebar-actions-panel">
    <action-menu-item
      v-for="(action, index) in actions"
      :key="`action-${index}`"
      :action="action"
      :action-options="{ space, resources }"
    />
  </oc-list>
</template>

<script setup lang="ts">
import {
  ActionExtension,
  ActionMenuItem,
  useExtensionRegistry,
  useFileActions,
  useIsAppActive,
  useFileActionsDelete,
  useFileActionsDownloadFile,
  useFileActionsRestore
} from '@opencloud-eu/web-pkg'
import { computed, inject, Ref, unref } from 'vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { fileSideBarActionsExtensionPoint } from '../../../extensionPoints'

const resource = inject<Ref<Resource>>('resource')
const space = inject<Ref<SpaceResource>>('space')
const resources = computed(() => {
  return [unref(resource)]
})
const { requestExtensions } = useExtensionRegistry()
const isAppActive = useIsAppActive()
const { getAllOpenWithActions } = useFileActions()
const extensionActions = computed(() =>
  requestExtensions<ActionExtension>(fileSideBarActionsExtensionPoint).map((e) => e.action)
)

const { actions: downloadFileActions } = useFileActionsDownloadFile()
const { actions: deleteActions } = useFileActionsDelete()
const { actions: restoreActions } = useFileActionsRestore()

const actions = computed(() => {
  const options = {
    space: unref(space),
    resources: unref(resources),
    // exclude editor actions inside editors
    omitEditorActions: !!unref(isAppActive)
  }

  return [
    // FIXME: remove as soon as actions are announced in extension system
    ...getAllOpenWithActions(options),
    ...[...unref(downloadFileActions), ...unref(deleteActions), ...unref(restoreActions)].filter(
      (action) => action.isVisible(options)
    ),

    ...unref(extensionActions).filter((action) => action.isVisible(options))
  ]
})
</script>
