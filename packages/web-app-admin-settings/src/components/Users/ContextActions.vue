<template>
  <div>
    <context-action-menu :menu-sections="menuSections" :action-options="{ resources: items }" />
  </div>
</template>

<script setup lang="ts">
import {
  useUserActionsEdit,
  useUserActionsDelete,
  useUserActionsEditQuota
} from '../../composables/actions/users'
import { computed, unref } from 'vue'
import { ContextActionMenu } from '@opencloud-eu/web-pkg'
import { User } from '@opencloud-eu/web-client/graph/generated'
import { useActionsShowDetails } from '../../composables/actions'

const { items } = defineProps<{ items: User[] }>()

const filterParams = computed(() => ({ resources: items }))

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
  unref(editQuotaActions).filter((item) => item.isVisible(unref(filterParams)))
)
const menuItemsQuaternaryActions = computed(() =>
  unref(showDetailsActions).filter((item) => item.isVisible(unref(filterParams)))
)

const menuSections = computed(() => {
  const sections = []

  if (unref(menuItemsPrimaryActions).length) {
    sections.push({
      name: 'primary',
      items: unref(menuItemsPrimaryActions)
    })
  }
  if (unref(menuItemsSecondaryActions).length) {
    sections.push({
      name: 'secondary',
      items: unref(menuItemsSecondaryActions)
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
