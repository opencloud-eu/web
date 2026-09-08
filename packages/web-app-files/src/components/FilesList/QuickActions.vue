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
      @click="
        (e: MouseEvent) =>
          action.handler({ space, resources: [item], event: e } as FileActionOptionsWithEvent)
      "
    >
      <oc-icon :name="getIconFromAction(action)" fill-type="line" />
    </oc-button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  Action,
  FileActionOptionsWithEvent,
  useEmbedMode,
  useFileActions
} from '@opencloud-eu/web-pkg'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { quickActionsExtensionPoint } from '../../extensionPoints'

const { item, space = undefined } = defineProps<{
  item: Resource
  space?: SpaceResource
}>()
const { getExtensionActions } = useFileActions()
const { isEnabled: isEmbedModeEnabled } = useEmbedMode()

const filteredActions = computed(() => {
  return getExtensionActions(quickActionsExtensionPoint.id).filter(({ isVisible }) =>
    isVisible({ space, resources: [item] })
  )
})

const getIconFromAction = (action: Action) => {
  return typeof action.icon === 'function' ? action.icon({ space, resources: [item] }) : action.icon
}
</script>
