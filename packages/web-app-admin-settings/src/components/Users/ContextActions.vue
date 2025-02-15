<template>
  <div>
    <context-action-menu :menu-sections="menuSections" :action-options="{ resources: items }" />
  </div>
</template>

<script lang="ts">
import {
  useUserActionsEdit,
  useUserActionsDelete,
  useUserActionsEditQuota
} from '../../composables/actions/users'
import { computed, defineComponent, PropType, unref } from 'vue'
import { ContextActionMenu } from '@opencloud-eu/web-pkg'
import { User } from '@opencloud-eu/web-client/graph/generated'
import { useActionsShowDetails } from '@opencloud-eu/web-pkg'

export default defineComponent({
  name: 'ContextActions',
  components: { ContextActionMenu },
  props: {
    items: {
      type: Array as PropType<User[]>,
      required: true
    }
  },
  setup(props) {
    const filterParams = computed(() => ({ resources: props.items }))

    const { actions: showDetailsActions } = useActionsShowDetails()
    const { actions: editQuotaActions } = useUserActionsEditQuota()
    const { actions: userEditActions } = useUserActionsEdit()
    const { actions: userDeleteActions } = useUserActionsDelete()

    const menuItemsPrimaryActions = computed(() =>
      [...unref(userEditActions), ...unref(userDeleteActions)].filter((item) =>
        item.isVisible(unref(filterParams))
      )
    )
    const menuItemsSecondaryActions = computed(() =>
      [...unref(editQuotaActions)].filter((item) => item.isVisible(unref(filterParams)))
    )

    const menuItemsSidebar = computed(() =>
      [...unref(showDetailsActions)].filter((item) => item.isVisible(unref(filterParams)))
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
