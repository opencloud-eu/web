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
const allowedSpaceActionExtensionIds = [
  'com.github.opencloud-eu.web.files.spaces.context-action.rename',
  'com.github.opencloud-eu.web.files.spaces.context-action.edit-description',
  'com.github.opencloud-eu.web.files.spaces.batch-action.duplicate',
  'com.github.opencloud-eu.web.files.spaces.batch-action.edit-quota',
  'com.github.opencloud-eu.web.files.spaces.batch-action.restore',
  'com.github.opencloud-eu.web.files.spaces.batch-action.delete',
  'com.github.opencloud-eu.web.files.spaces.batch-action.disable',
  'com.github.opencloud-eu.web.files.sidebar-action.details'
]
const detailsActionExtensionId = 'com.github.opencloud-eu.web.files.sidebar-action.details'

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

    const allActions = computed(() =>
      getActionExtensions()
        .filter((extension) => allowedSpaceActionExtensionIds.includes(extension.id))
        .map((extension) => {
          if (extension.id === detailsActionExtensionId) {
            return {
              ...extension.action,
              category: 'quaternary' as const
            }
          }

          return extension.action
        })
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
    const menuItemsQuaternaryActions = computed(() =>
      [...unref(allActions).filter((action) => action.category === 'quaternary')].filter((item) =>
        item.isVisible(unref(filterParams))
      )
    )

    const menuSections = computed(() => {
      const sections = []

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
