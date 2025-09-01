<template>
  <div>
    <oc-list
      id="oc-appbar-batch-actions"
      class="block xl:flex xl:items-center"
      :class="{ 'oc-appbar-batch-actions-squashed': limitedScreenSpace }"
    >
      <action-menu-item
        v-for="(action, index) in actions"
        :key="`action-${index}`"
        :action="action"
        :action-options="actionOptions"
        appearance="raw"
        class="batch-actions mr-2"
        :shortcut-hint="false"
        :show-tooltip="limitedScreenSpace"
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
<style>
@reference '@opencloud-eu/design-system/tailwind';

@layer utilities {
  #oc-appbar-batch-actions .action-menu-item {
    @apply p-2 gap-1;
  }

  .oc-appbar-batch-actions-squashed .oc-files-context-action-label {
    @apply hidden;
  }
}
</style>
<style lang="scss">
#oc-appbar-batch-actions {
  li {
    float: left !important;
  }
}
</style>
