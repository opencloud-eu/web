<template>
  <div v-if="!isEmbedModeEnabled" class="flex">
    <oc-button
      v-for="action in filteredActions"
      :key="action.label()"
      v-oc-tooltip="action.label()"
      :aria-label="action.label()"
      appearance="raw"
      class="ml-1 quick-action-button p-1"
      :class="`files-quick-action-${action.name}`"
      :disabled="action.isDisabled({ resources: [space] })"
      @click="action.handler({ resources: [space] })"
    >
      <oc-icon :name="getActionIcon(action)" fill-type="line" />
    </oc-button>
  </div>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { Action, useEmbedMode, useExtensionRegistry } from '@opencloud-eu/web-pkg'
import { SpaceResource } from '@opencloud-eu/web-client'
import { trashQuickActionsExtensionPoint } from '../../extensionPoints'

const props = defineProps<{
  space?: SpaceResource
}>()

const extensionRegistry = useExtensionRegistry()
const { isEnabled: isEmbedModeEnabled } = useEmbedMode()

const filteredActions = computed(() => {
  return unref(extensionRegistry)
    .requestExtensions(trashQuickActionsExtensionPoint)
    .map((e) => e.action)
    .filter(({ isVisible }) => isVisible({ resources: [props.space] }))
})

const getActionIcon = (action: Action) => {
  return typeof action.icon === 'function' ? action.icon({ resources: [props.space] }) : action.icon
}
</script>
