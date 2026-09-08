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
  ActionMenuItem,
  FileActionOptions,
  useFileActions,
  useIsAppActive
} from '@opencloud-eu/web-pkg'
import { computed, inject, Ref, unref } from 'vue'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { fileSideBarActionsExtensionPoint } from '../../../extensionPoints'

const resource = inject<Ref<Resource>>('resource')
const space = inject<Ref<SpaceResource>>('space')
const resources = computed(() => [unref(resource)])

const isAppActive = useIsAppActive()
const { getAllOpenWithActions, getExtensionActions } = useFileActions()
const extensionActions = computed(() => getExtensionActions(fileSideBarActionsExtensionPoint.id))
const actions = computed(() => {
  if (!unref(resource)) {
    return []
  }

  const options: FileActionOptions = {
    space: unref(space),
    resources: unref(resources)
  }

  return [
    // exclude editor actions inside editors
    ...(unref(isAppActive) ? [] : getAllOpenWithActions(options)),
    ...unref(extensionActions).filter((action) => action.isVisible(options))
  ]
})
</script>
