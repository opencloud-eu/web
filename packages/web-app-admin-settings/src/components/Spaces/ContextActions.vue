<template>
  <div>
    <context-action-menu :menu-sections="menuSections" :action-options="{ resources: items }" />
  </div>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { SpaceResource } from '@opencloud-eu/web-client'
import { ContextActionMenu, FileActionOptions, useFileActions } from '@opencloud-eu/web-pkg'
import { spacesContextActionsExtensionPoint } from '../../extensionPoints'

const { items } = defineProps<{ items: SpaceResource[] }>()

const filterParams = computed<FileActionOptions>(() => ({
  resources: items,
  space: undefined
}))

const { getExtensionActions } = useFileActions()
const contextActions = computed(() =>
  getExtensionActions(spacesContextActionsExtensionPoint.id).filter((a) =>
    a.isVisible(unref(filterParams))
  )
)

const menuItemsPrimaryActions = computed(() =>
  unref(contextActions).filter((action) => action.category === 'primary')
)
const menuItemsSecondaryActions = computed(() =>
  unref(contextActions).filter((action) => action.category === 'secondary')
)
const menuItemsTertiaryActions = computed(() =>
  unref(contextActions).filter((action) => action.category === 'tertiary')
)
const menuItemsQuaternaryActions = computed(() =>
  unref(contextActions).filter((action) => action.category === 'quaternary')
)

const menuSections = computed(() => {
  const sections = []

  if (unref(menuItemsPrimaryActions).length) {
    sections.push({
      name: 'primaryActions',
      items: unref(menuItemsPrimaryActions)
    })
  }
  if (unref(menuItemsSecondaryActions).length) {
    sections.push({
      name: 'secondaryActions',
      items: unref(menuItemsSecondaryActions)
    })
  }
  if (unref(menuItemsTertiaryActions).length) {
    sections.push({
      name: 'tertiaryActions',
      items: unref(menuItemsTertiaryActions)
    })
  }
  if (unref(menuItemsQuaternaryActions).length) {
    sections.push({
      name: 'quaternaryActions',
      items: unref(menuItemsQuaternaryActions)
    })
  }
  return sections
})
</script>
