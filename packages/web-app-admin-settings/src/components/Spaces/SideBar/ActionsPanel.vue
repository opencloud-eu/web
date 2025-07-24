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
import { ActionMenuItem } from '@opencloud-eu/web-pkg'
import {
  useSpaceActionsDelete,
  useSpaceActionsDisable,
  useSpaceActionsEditDescription,
  useSpaceActionsEditQuota,
  useSpaceActionsRename,
  useSpaceActionsRestore
} from '@opencloud-eu/web-pkg'
import { computed, inject, unref } from 'vue'
import { SpaceResource } from '@opencloud-eu/web-client'

const resource = inject<SpaceResource>('resource')
const resources = computed(() => {
  return [unref(resource)]
})
const actionOptions = computed(() => ({
  resources: unref(resources)
}))

const { actions: deleteActions } = useSpaceActionsDelete()
const { actions: disableActions } = useSpaceActionsDisable()
const { actions: editDescriptionActions } = useSpaceActionsEditDescription()
const { actions: editQuotaActions } = useSpaceActionsEditQuota()
const { actions: renameActions } = useSpaceActionsRename()
const { actions: restoreActions } = useSpaceActionsRestore()

const actions = computed(() => {
  return [
    ...unref(renameActions),
    ...unref(editDescriptionActions),
    ...unref(editQuotaActions),
    ...unref(restoreActions),
    ...unref(deleteActions),
    ...unref(disableActions)
  ].filter((item) => item.isVisible(unref(actionOptions)))
})
</script>
