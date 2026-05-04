<template>
  <div>
    <context-action-menu :menu-sections="menuSections" :action-options="{ resources: items }" />
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, unref } from 'vue'
import { SpaceResource } from '@opencloud-eu/web-client'
import { ActionExtension, ContextActionMenu, useExtensionRegistry } from '@opencloud-eu/web-pkg'

const contextActionsExtensionPoint = {
  id: 'global.files.context-actions',
  extensionType: 'action'
} as const

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
    const getActionExtensions = () => {
      const extensions = requestExtensions
        ? requestExtensions<ActionExtension>(contextActionsExtensionPoint)
        : []
      return extensions || []
    }

    const allActions = computed(() => getActionExtensions().map((e) => e.action))

    const menuItemsPrimaryActions = computed(() =>
      [...unref(allActions).filter((action) => action.category === 'primary')].filter((item) =>
        item.isVisible(unref(filterParams))
      )
    )
    const menuItemsSecondaryActions = computed(() =>
      [...unref(allActions).filter((action) => action.category === 'secondary')].filter((item) =>
        item.isVisible(unref(filterParams))
      )
    )
    const menuItemsTertiaryActions = computed(() =>
      [...unref(allActions).filter((action) => action.category === 'tertiary')].filter((item) =>
        item.isVisible(unref(filterParams))
      )
    )
    const menuItemsSidebar = computed(() =>
      [...unref(allActions).filter((action) => action.category === 'sidebar')].filter((item) =>
        item.isVisible(unref(filterParams))
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
      if (unref(menuItemsSidebar).length) {
        sections.push({
          name: 'sidebar',
          items: unref(menuItemsSidebar)
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
