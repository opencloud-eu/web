import { computed, Ref, unref } from 'vue'
import { Resource } from '@opencloud-eu/web-client'
import { useEventBus } from '../eventBus'
import { useGettext } from 'vue3-gettext'

export const useResourceViewSelection = ({
  resources,
  disabledResources,
  selectedIds,
  emit
}: {
  resources: Ref<Resource[]>
  disabledResources: Ref<string[]>
  selectedIds: Ref<string[]>
  emit: ReturnType<typeof defineEmits>
}) => {
  const eventBus = useEventBus()
  const { $gettext } = useGettext()

  const emitSelect = (selectedIds: string[]) => {
    eventBus.publish('app.files.list.clicked')
    emit('update:selectedIds', selectedIds)
  }

  const getResourceCheckboxLabel = (resource: Resource) => {
    switch (resource.type) {
      case 'folder':
        return $gettext('Select folder')
      case 'space':
        return $gettext('Select space')
      default:
        return $gettext('Select file')
    }
  }

  const areAllResourcesSelected = computed(() => {
    const allResourcesDisabled = unref(disabledResources).length === unref(resources).length
    const allSelected =
      unref(selectedIds).length === unref(resources).length - unref(disabledResources).length

    return !allResourcesDisabled && allSelected
  })

  const selectAllCheckboxLabel = computed(() => {
    return unref(areAllResourcesSelected) ? $gettext('Clear selection') : $gettext('Select all')
  })

  const toggleSelectionAll = () => {
    if (unref(areAllResourcesSelected)) {
      return emitSelect([])
    }
    emitSelect(
      unref(resources)
        .filter((resource) => !unref(disabledResources).includes(resource.id))
        .map((resource) => resource.id)
    )
  }

  return {
    getResourceCheckboxLabel,
    areAllResourcesSelected,
    selectAllCheckboxLabel,
    toggleSelectionAll
  }
}
