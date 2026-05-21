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

<script lang="ts">
import ActionMenuItem from './ContextActions/ActionMenuItem.vue'
import { defineComponent, PropType } from 'vue'
import { Action, ActionOptions } from '../composables'

export default defineComponent({
  name: 'BatchActions',
  components: { ActionMenuItem },
  props: {
    actions: {
      type: Array as PropType<Action[]>,
      required: true
    },
    actionOptions: {
      type: Object as PropType<ActionOptions>,
      required: true
    },
    limitedScreenSpace: {
      type: Boolean,
      default: false,
      required: false
    }
  }
})
</script>
