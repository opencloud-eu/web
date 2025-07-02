<template>
  <context-action-menu :menu-sections="menuSections" :action-options="actionOptions" />
</template>

<script lang="ts">
import {
  ContextActionMenu,
  MenuSection,
  SpaceActionOptions,
  useSpaceActionsNavigateToTrash
} from '@opencloud-eu/web-pkg'
import { computed, defineComponent, PropType, Ref, toRef, unref } from 'vue'

export default defineComponent({
  name: 'TrashContextActions',
  components: { ContextActionMenu },
  props: {
    actionOptions: {
      type: Object as PropType<SpaceActionOptions>,
      required: true
    }
  },
  setup(props) {
    const actionOptions = toRef(props, 'actionOptions') as Ref<SpaceActionOptions>

    const { actions: navigateToTrashActions } = useSpaceActionsNavigateToTrash()

    const menuItemsPrimaryActions = computed(() => {
      const fileHandlers = [...unref(navigateToTrashActions)]
      return [...fileHandlers].filter((item) => item.isVisible(unref(actionOptions)))
    })

    const menuSections = computed(() => {
      const sections: MenuSection[] = []

      if (unref(menuItemsPrimaryActions)) {
        sections.push({
          name: 'primaryActions',
          items: unref(menuItemsPrimaryActions)
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
