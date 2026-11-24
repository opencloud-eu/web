import { computed, unref } from 'vue'
import { Resource } from '@opencloud-eu/web-client'
import { useResourcesStore } from '../piniaStores'
import { useEmbedMode } from '../embedMode'

export const useIsResourceDisabled = () => {
  const resourcesStore = useResourcesStore()
  const { isEnabled: isEmbedModeEnabled, fileTypes: embedModeFileTypes } = useEmbedMode()

  const deleteQueueSet = computed(() => new Set(resourcesStore.deleteQueue))
  const isResourceInDeleteQueue = (id: string): boolean => {
    return unref(deleteQueueSet).has(id)
  }

  const embedModeFileTypesSet = computed(
    () => new Set((unref(embedModeFileTypes) || []).map((fileType) => fileType.toLowerCase()))
  )

  const isResourceDisabled = (resource: Resource) => {
    if (unref(isEmbedModeEnabled) && resource.isInVault) {
      return true
    }

    if (unref(isEmbedModeEnabled) && unref(embedModeFileTypesSet).size) {
      return (
        !unref(embedModeFileTypesSet).has(resource.extension?.toLowerCase()) &&
        !unref(embedModeFileTypesSet).has(resource.mimeType?.toLowerCase()) &&
        !resource.isFolder
      )
    }

    if (isResourceInDeleteQueue(resource.id)) {
      return true
    }

    return resource.processing === true
  }

  return { isResourceDisabled, isResourceInDeleteQueue }
}
