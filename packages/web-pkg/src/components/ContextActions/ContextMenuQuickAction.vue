<template>
  <oc-button
    :id="`context-menu-trigger-${resourceDomSelector(item)}`"
    v-oc-tooltip="contextMenuLabel"
    :aria-label="contextMenuLabel"
    appearance="raw"
    class="quick-action-button oc-ml-xs oc-p-xs"
    @click.stop.prevent="
      $emit('quickActionClicked', {
        event: $event,
        dropdown: $refs[`context-menu-drop-ref-${resourceDomSelector(item)}`]
      })
    "
  >
    <oc-icon name="more-2" />
    <oc-drop
      :ref="`context-menu-drop-ref-${resourceDomSelector(item)}`"
      :drop-id="`context-menu-drop-${resourceDomSelector(item)}`"
      :toggle="`#context-menu-trigger-${resourceDomSelector(item)}`"
      position="bottom-end"
      mode="hover-click"
      padding-size="small"
      close-on-click
    >
      <slot name="contextMenu" :item="item" />
    </oc-drop>
  </oc-button>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import { extractDomSelector, Resource } from '@opencloud-eu/web-client'
import { useGettext } from 'vue3-gettext'

export default defineComponent({
  name: 'ContextMenuQuickAction',
  props: {
    item: {
      type: Object,
      required: true
    },
    resourceDomSelector: {
      type: Function,
      required: false,
      default: (resource: Resource) => extractDomSelector(resource.id)
    }
  },
  emits: ['quickActionClicked'],
  setup() {
    const { $gettext } = useGettext()
    const contextMenuLabel = computed(() => $gettext('Show context menu'))

    return {
      contextMenuLabel
    }
  }
})
</script>
