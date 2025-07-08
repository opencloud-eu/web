<template>
  <div v-if="loading" class="oc-flex oc-flex-center oc-my-m">
    <oc-spinner :aria-label="$gettext('Loading actions')" />
  </div>
  <div v-else>
    <context-action-menu :menu-sections="menuSections" :action-options="actionOptions" />
  </div>
</template>

<script setup lang="ts">
import {
  ContextActionMenu,
  MenuSection,
  SpaceActionOptions,
  useFileActionsEmptyTrashBin,
  useSpaceActionsNavigateToTrash
} from '@opencloud-eu/web-pkg'
import { computed, toRef, unref } from 'vue'

const props = defineProps<{
  actionOptions: SpaceActionOptions
  loading?: boolean
}>()

const actionOptions = toRef(props, 'actionOptions')

const { actions: navigateToTrashActions } = useSpaceActionsNavigateToTrash()
const { actions: emptyTrashBinActions } = useFileActionsEmptyTrashBin()

const menuItemsPrimaryActions = computed(() =>
  [...unref(navigateToTrashActions), ...unref(emptyTrashBinActions)].filter((item) =>
    item.isVisible(unref(actionOptions))
  )
)

const menuSections = computed<MenuSection[]>(() => {
  const sections: MenuSection[] = []

  if (unref(menuItemsPrimaryActions).length) {
    sections.push({
      name: 'primaryActions',
      items: unref(menuItemsPrimaryActions)
    })
  }

  return sections
})
</script>
