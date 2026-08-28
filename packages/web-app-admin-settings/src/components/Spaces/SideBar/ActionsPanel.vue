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
import { ActionMenuItem, FileActionOptions, useFileActions } from '@opencloud-eu/web-pkg'
import { computed, inject, unref } from 'vue'
import { SpaceResource } from '@opencloud-eu/web-client'
import { spacesSidebarActionsExtensionPoint } from '../../../extensionPoints'

const resource = inject<SpaceResource>('resource')
const resources = computed(() => {
  return [unref(resource)]
})
const actionOptions = computed<FileActionOptions>(() => ({
  resources: unref(resources),
  space: undefined
}))
const { getExtensionActions } = useFileActions()

const actions = computed(() =>
  getExtensionActions(spacesSidebarActionsExtensionPoint.id).filter((item) =>
    item.isVisible(unref(actionOptions))
  )
)
</script>
