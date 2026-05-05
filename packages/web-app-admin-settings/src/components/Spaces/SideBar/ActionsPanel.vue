<template>
  <div>
    <oc-list id="oc-spaces-actions-sidebar" class="sidebar-actions-panel">
      <action-menu-item
        v-for="(action, index) in actions"
        :key="`action-${index}`"
        :action="action"
        :action-options="actionOptions"
      />
    </oc-list>
  </div>
</template>

<script setup lang="ts">
import { ActionExtension, ActionMenuItem, useExtensionRegistry } from '@opencloud-eu/web-pkg'
import { computed, inject, unref } from 'vue'
import { SpaceResource } from '@opencloud-eu/web-client'
import { spacesSidebarActionsExtensionPoint } from '../../../extensionPoints'

const resource = inject<SpaceResource>('resource')
const resources = computed(() => {
  return [unref(resource)]
})
const actionOptions = computed(() => ({
  resources: unref(resources)
}))
const { requestExtensions } = useExtensionRegistry()

const actions = computed(() => {
  return (requestExtensions<ActionExtension>(spacesSidebarActionsExtensionPoint) || [])
    .map((extension) => extension.action)
    .filter((item) => item.isVisible(unref(actionOptions)))
})
</script>
