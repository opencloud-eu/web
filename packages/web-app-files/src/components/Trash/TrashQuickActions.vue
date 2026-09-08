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
      :disabled="action.isDisabled({ resources: [space], space: undefined })"
      @click="action.handler({ resources: [space], space: undefined })"
    >
      <oc-icon :name="getActionIcon(action)" fill-type="line" />
    </oc-button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Action, useEmbedMode, useFileActions } from '@opencloud-eu/web-pkg'
import { SpaceResource } from '@opencloud-eu/web-client'
import { trashQuickActionsExtensionPoint } from '../../extensionPoints'

const props = defineProps<{
  space?: SpaceResource
}>()

const { getExtensionActions } = useFileActions()
const { isEnabled: isEmbedModeEnabled } = useEmbedMode()

const filteredActions = computed(() => {
  return getExtensionActions(trashQuickActionsExtensionPoint.id).filter(({ isVisible }) =>
    isVisible({ resources: [props.space], space: undefined })
  )
})

const getActionIcon = (action: Action) => {
  return typeof action.icon === 'function' ? action.icon({ resources: [props.space] }) : action.icon
}
</script>
