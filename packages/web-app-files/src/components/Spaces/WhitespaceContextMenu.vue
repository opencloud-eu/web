<template>
  <oc-button
    id="context-menu-trigger-whitespace"
    class="size-0 invisible"
    aria-hidden
    appearance="raw"
  >
    <oc-drop
      drop-id="context-menu-drop-whitespace"
      toggle="#context-menu-trigger-whitespace"
      position="bottom-end"
      mode="click"
      class="whitespace-context-actions-list"
      close-on-click
      padding-size="small"
    >
      <oc-list>
        <action-menu-item
          v-for="(action, actionIndex) in menuItemsActions"
          :key="`section-${action.name}-action-${actionIndex}`"
          :action="action"
          :action-options="actionOptions"
          :data-testid="`whitespace-context-menu-item-${action.name}`"
        />
      </oc-list>
    </oc-drop>
  </oc-button>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import {
  useFileActionsPaste,
  useFileActionsShowDetails,
  useResourcesStore
} from '@opencloud-eu/web-pkg'
import { useFileActionsCreateNewFolder } from '@opencloud-eu/web-pkg'
import { SpaceResource } from '@opencloud-eu/web-client'
import { ActionMenuItem } from '@opencloud-eu/web-pkg'
import { storeToRefs } from 'pinia'

export default defineComponent({
  name: 'WhitespaceContextMenu',
  components: { ActionMenuItem },
  props: {
    space: {
      type: Object as PropType<SpaceResource>,
      required: false,
      default: null
    }
  },
  setup(props) {
    const { $gettext } = useGettext()
    const resourcesStore = useResourcesStore()
    const { currentFolder } = storeToRefs(resourcesStore)

    const space = computed(() => props.space)
    const contextMenuLabel = computed(() => $gettext('Show context menu'))
    const actionOptions = computed(() => ({
      space: unref(space),
      resources: [currentFolder.value]
    }))
    const { actions: createNewFolderAction } = useFileActionsCreateNewFolder({ space })
    const { actions: showDetailsAction } = useFileActionsShowDetails()
    const { actions: pasteAction } = useFileActionsPaste()

    const menuItemsActions = computed(() => {
      return [
        ...unref(createNewFolderAction),
        ...unref(pasteAction),
        ...unref(showDetailsAction)
      ].filter((item) => item.isVisible(unref(actionOptions)))
    })

    return { contextMenuLabel, actionOptions, currentFolder, menuItemsActions }
  }
})
</script>
