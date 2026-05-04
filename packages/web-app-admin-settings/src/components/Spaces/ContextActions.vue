<template>
  <div>
    <context-action-menu :menu-sections="menuSections" :action-options="{ resources: items }" />
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, unref } from 'vue'
import { SpaceResource } from '@opencloud-eu/web-client'
import { ActionExtension, ContextActionMenu, useExtensionRegistry } from '@opencloud-eu/web-pkg'
import {
  spacesContextActionsExtensionPoint,
  spacesSidebarActionsExtensionPoint
} from '../../extensionPoints'

export default defineComponent({
  name: 'ContextActions',
  components: { ContextActionMenu },
  props: {
    items: {
      type: Array as PropType<SpaceResource[]>,
      required: true
    }
  },
  setup(props) {
    const filterParams = computed(() => ({ resources: props.items }))
    const { requestExtensions } = useExtensionRegistry()
    const getActionExtensions = (
      extensionPoint:
        | typeof spacesContextActionsExtensionPoint
        | typeof spacesSidebarActionsExtensionPoint
    ) => {
      const extensions = requestExtensions ? requestExtensions<ActionExtension>(extensionPoint) : []
      return extensions || []
    }

    const contextActions = computed(() =>
      getActionExtensions(spacesContextActionsExtensionPoint).map((e) => e.action)
    )
    const sidebarActions = computed(() =>
      getActionExtensions(spacesSidebarActionsExtensionPoint).map((e) => e.action)
    )

    const menuItemsPrimaryActions = computed(() =>
      [...unref(contextActions).filter((action) => action.category === 'primary')].filter((item) =>
        item.isVisible(unref(filterParams))
      )
    )
    const menuItemsSecondaryActions = computed(() =>
      [...unref(contextActions).filter((action) => action.category === 'secondary')].filter(
        (item) => item.isVisible(unref(filterParams))
      )
    )
    const menuItemsTertiaryActions = computed(() =>
      [...unref(contextActions).filter((action) => action.category === 'tertiary')].filter((item) =>
        item.isVisible(unref(filterParams))
      )
    )
    const menuItemsQuaternaryActions = computed(() =>
      [...unref(sidebarActions).filter((action) => action.category === 'quaternary')].filter(
        (item) => item.isVisible(unref(filterParams))
      )
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

    return {
      menuSections
    }
  }
})
</script>
