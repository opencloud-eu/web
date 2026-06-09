<template>
  <div>
    <oc-list
      id="oc-appbar-batch-actions"
      class="flex items-center gap-0.5"
      :class="{
        'oc-appbar-batch-actions-squashed [&_.oc-files-context-action-label]:hidden':
          limitedScreenSpace
      }"
    >
      <action-menu-item
        v-for="(action, index) in actions"
        :key="`action-${index}`"
        :action="action"
        :action-options="actionOptions"
        appearance="raw"
        class="batch-actions float-left [&_.action-menu-item]:p-2 [&_.action-menu-item]:gap-1 [&_button]:py-1!"
        :shortcut-hint="false"
        :show-tooltip="limitedScreenSpace"
        :size="limitedScreenSpace ? 'medium' : 'small'"
      />
    </oc-list>
  </div>
</template>

<script setup lang="ts">
import ActionMenuItem from './ContextActions/ActionMenuItem.vue'
import { Action, ActionOptions } from '../composables'

const {
  actions,
  actionOptions,
  limitedScreenSpace = false
} = defineProps<{
  actions: Action[]
  actionOptions: ActionOptions
  limitedScreenSpace?: boolean
}>()
</script>
