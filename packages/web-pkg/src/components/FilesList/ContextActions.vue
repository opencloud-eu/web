<template>
  <context-action-menu :menu-sections="menuSections" :action-options="actionOptions" />
</template>

<script setup lang="ts">
import ContextActionMenu from '../ContextActions/ContextActionMenu.vue'
import { computed, unref } from 'vue'
import { FileActionOptions, useFileActions, useFileActionsOpenWithDefault } from '../../composables'
import { useGettext } from 'vue3-gettext'
import { MenuSection } from '../ContextActions'

const { actionOptions } = defineProps<{
  actionOptions: FileActionOptions
}>()

const { getAllOpenWithActions, getExtensionActions } = useFileActions()
const { $gettext } = useGettext()

const { actions: openWithDefaultActions } = useFileActionsOpenWithDefault()

const extensionContextActions = computed(() =>
  getExtensionActions('global.files.context-actions').filter((a) =>
    a.isVisible(unref(actionOptions))
  )
)

const menuItemsPrimary = computed(() => {
  return unref(openWithDefaultActions)
    .filter((item) => item.isVisible(unref(actionOptions)))
    .sort((x, y) => Number(y.hasPriority) - Number(x.hasPriority))
})

const menuItemsPrimaryDrop = computed(() => {
  return getAllOpenWithActions(unref(actionOptions))
    .filter((item) => item.isVisible(unref(actionOptions)))
    .sort((x, y) => Number(y.hasPriority) - Number(x.hasPriority))
})

const menuItemsSecondary = computed(() =>
  unref(extensionContextActions).filter((a) => a.category === 'secondary')
)

const menuItemsTertiary = computed(() =>
  unref(extensionContextActions).filter((a) => !a.category || a.category === 'tertiary')
)

const menuItemsQuaternary = computed(() =>
  unref(extensionContextActions).filter((a) => a.category === 'quaternary')
)

const menuSections = computed(() => {
  const sections: MenuSection[] = []
  if ([...unref(menuItemsPrimary), ...unref(menuItemsPrimaryDrop)].length) {
    sections.push({
      name: 'primary',
      items: [...unref(menuItemsPrimary)],
      dropItems: [
        {
          label: $gettext('Open with...'),
          name: 'open-with',
          icon: 'apps',
          items: [...unref(menuItemsPrimaryDrop)]
        }
      ]
    })
  }

  if (unref(menuItemsSecondary).length) {
    sections.push({
      name: 'secondary',
      items: unref(menuItemsSecondary)
    })
  }
  if (unref(menuItemsTertiary).length) {
    sections.push({
      name: 'tertiary',
      items: unref(menuItemsTertiary)
    })
  }
  if (unref(menuItemsQuaternary).length) {
    sections.push({
      name: 'quaternary',
      items: unref(menuItemsQuaternary)
    })
  }
  return sections
})
</script>
