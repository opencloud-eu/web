<template>
  <context-action-menu :menu-sections="menuSections" :action-options="actionOptions" />
</template>

<script setup lang="ts">
import {
  ContextActionMenu,
  MenuSection,
  SpaceActionOptions,
  useSpaceActionsNavigateToTrash
} from '@opencloud-eu/web-pkg'
import { computed, toRef, unref } from 'vue'

const props = defineProps<{
  actionOptions: SpaceActionOptions
}>()

const actionOptions = toRef(props, 'actionOptions')

const { actions: navigateToTrashActions } = useSpaceActionsNavigateToTrash()

const menuItemsPrimaryActions = computed(() => {
  const fileHandlers = [...unref(navigateToTrashActions)]
  return fileHandlers.filter((item) => item.isVisible(unref(actionOptions)))
})

const menuSections = computed<MenuSection[]>(() => {
  const sections: MenuSection[] = []

  if (unref(menuItemsPrimaryActions)) {
    sections.push({
      name: 'primaryActions',
      items: unref(menuItemsPrimaryActions)
    })
  }

  return sections
})
</script>
