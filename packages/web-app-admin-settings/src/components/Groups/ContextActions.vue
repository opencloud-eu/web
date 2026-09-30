<template>
  <div>
    <context-action-menu :menu-sections="menuSections" :action-options="actionOptions" />
  </div>
</template>

<script setup lang="ts">
import { computed, unref } from 'vue'
import { ContextActionMenu, GroupActionOptions } from '@opencloud-eu/web-pkg'
import { useActionsShowDetails } from '../../composables/actions'
import { useGroupActionsEdit, useGroupActionsDelete } from '../../composables/actions/groups'

const { actionOptions } = defineProps<{ actionOptions: GroupActionOptions }>()

const { actions: showDetailsActions } = useActionsShowDetails()
const { actions: deleteActions } = useGroupActionsDelete()
const { actions: editActions } = useGroupActionsEdit()

const menuItemsPrimaryActions = computed(() =>
  [...unref(editActions), ...unref(deleteActions)].filter((item) => item.isVisible(actionOptions))
)

const menuItemsQuaternaryActions = computed(() =>
  unref(showDetailsActions).filter((item) => item.isVisible(actionOptions))
)

const menuSections = computed(() => {
  const sections = []

  if (unref(menuItemsPrimaryActions).length) {
    sections.push({
      name: 'primary',
      items: unref(menuItemsPrimaryActions)
    })
  }
  if (unref(menuItemsQuaternaryActions).length) {
    sections.push({
      name: 'quaternary',
      items: unref(menuItemsQuaternaryActions)
    })
  }
  return sections
})
</script>
