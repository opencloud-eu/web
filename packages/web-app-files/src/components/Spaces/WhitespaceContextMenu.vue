<template>
  <oc-drop
    ref="drop"
    drop-id="context-menu-drop-whitespace"
    mode="manual"
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
</template>

<script setup lang="ts">
import {
  ComponentPublicInstance,
  computed,
  onBeforeUnmount,
  onMounted,
  unref,
  useTemplateRef
} from 'vue'
import {
  useFileActionsPaste,
  useFileActionsShowDetails,
  useResourcesStore
} from '@opencloud-eu/web-pkg'
import { useFileActionsCreateNewFolder } from '@opencloud-eu/web-pkg'
import { SpaceResource } from '@opencloud-eu/web-client'
import { ActionMenuItem } from '@opencloud-eu/web-pkg'
import { storeToRefs } from 'pinia'
import { OcDrop } from '@opencloud-eu/design-system/components'

const { space } = defineProps<{ space: SpaceResource }>()

const drop = useTemplateRef<ComponentPublicInstance<typeof OcDrop>>('drop')
const resourcesStore = useResourcesStore()
const { currentFolder } = storeToRefs(resourcesStore)

const actionOptions = computed(() => ({
  space: unref(space),
  resources: [currentFolder.value]
}))
const { actions: createNewFolderAction } = useFileActionsCreateNewFolder({
  space: computed(() => space)
})
const { actions: showDetailsAction } = useFileActionsShowDetails()
const { actions: pasteAction } = useFileActionsPaste()

const menuItemsActions = computed(() => {
  return [
    ...unref(createNewFolderAction),
    ...unref(pasteAction),
    ...unref(showDetailsAction)
  ].filter((item) => item.isVisible(unref(actionOptions)))
})

const hanldeContextMenu = (event: Event) => {
  const { target } = event
  if ((target as HTMLElement).closest('.has-item-context-menu')) {
    return
  }
  event.preventDefault()
  unref(drop)?.show({ event, useMouseAnchor: true })
}

let filesViewWrapper: Element | undefined
onMounted(() => {
  filesViewWrapper = document.getElementsByClassName('files-view-wrapper')[0]
  filesViewWrapper?.addEventListener('contextmenu', hanldeContextMenu)
})
onBeforeUnmount(() => {
  filesViewWrapper?.removeEventListener('contextmenu', hanldeContextMenu)
})
</script>
