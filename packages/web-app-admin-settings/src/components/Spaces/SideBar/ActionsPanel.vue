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

const contextActionsExtensionPoint = {
  id: 'global.files.context-actions',
  extensionType: 'action'
} as const
const allowedSpaceActionExtensionIds = [
  'com.github.opencloud-eu.web.files.spaces.context-action.rename',
  'com.github.opencloud-eu.web.files.spaces.context-action.edit-description',
  'com.github.opencloud-eu.web.files.spaces.batch-action.duplicate',
  'com.github.opencloud-eu.web.files.spaces.batch-action.edit-quota',
  'com.github.opencloud-eu.web.files.spaces.batch-action.restore',
  'com.github.opencloud-eu.web.files.spaces.batch-action.delete',
  'com.github.opencloud-eu.web.files.spaces.batch-action.disable'
]

const resource = inject<SpaceResource>('resource')
const resources = computed(() => {
  return [unref(resource)]
})
const actionOptions = computed(() => ({
  resources: unref(resources)
}))
const { requestExtensions } = useExtensionRegistry()
const contextActions = computed(() => {
  const extensions = requestExtensions
    ? requestExtensions<ActionExtension>(contextActionsExtensionPoint)
    : []
  return (extensions || [])
    .filter((extension) => allowedSpaceActionExtensionIds.includes(extension.id))
    .map((e) => e.action)
})

const actions = computed(() => {
  return [
    ...unref(contextActions).filter(
      (action) => action.category === 'secondary' || action.category === 'tertiary'
    )
  ].filter((item) => item.isVisible(unref(actionOptions)))
})
</script>
