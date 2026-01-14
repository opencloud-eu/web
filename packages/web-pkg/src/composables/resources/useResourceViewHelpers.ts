import { computed, Ref, unref } from 'vue'
import { useResourcesStore } from '../piniaStores'
import { useRouter } from '../router'
import { useEventBus } from '../eventBus'
import { useInterceptModifierClick } from '../keyboardActions'
import { embedModeFilePickMessageData, useEmbedMode } from '../embedMode'
import { Resource } from '@opencloud-eu/web-client'
import { routeToContextQuery } from '../appDefaults'
import { useGetMatchingSpace } from '../spaces'
import { useResourceViewDrag } from './useResourceViewDrag'

/**
 * Shared helpers for resource view components (like ResourceTable and ResourceTiles).
 */
export const useResourceViewHelpers = ({
  resources,
  selectedIds,
  emit
}: {
  resources: Ref<Resource[]>
  selectedIds: Ref<string[]>
  emit: (...args: any[]) => void
}) => {
  const resourcesStore = useResourcesStore()
  const router = useRouter()
  const eventBus = useEventBus()
  const { interceptModifierClick } = useInterceptModifierClick()
  const { getMatchingSpace } = useGetMatchingSpace()
  const {
    isEnabled: isEmbedModeEnabled,
    fileTypes: embedModeFileTypes,
    isFilePicker,
    postMessage
  } = useEmbedMode()

  const selectedResources = computed(() => {
    return unref(resources).filter((resource) => unref(selectedIds).includes(resource.id))
  })

  const isResourceSelected = (item: Resource) => {
    return unref(selectedIds).includes(item.id)
  }

  const isResourceInDeleteQueue = (id: string): boolean => {
    return resourcesStore.deleteQueue.includes(id)
  }

  const isResourceDisabled = (resource: Resource) => {
    if (unref(isEmbedModeEnabled) && unref(embedModeFileTypes)?.length) {
      return (
        !unref(embedModeFileTypes).includes(resource.extension) &&
        !unref(embedModeFileTypes).includes(resource.mimeType) &&
        !resource.isFolder
      )
    }

    if (isResourceInDeleteQueue(resource.id)) {
      return true
    }

    return resource.processing === true
  }

  // tr or tile containing the file clicked
  const fileContainerClicked = ({
    resource,
    event
  }: {
    resource: Resource
    event: MouseEvent | KeyboardEvent
  }) => {
    if (isResourceDisabled(resource)) {
      return
    }

    if (unref(isEmbedModeEnabled) && unref(isFilePicker) && !resource.isFolder) {
      return postMessage<embedModeFilePickMessageData>('opencloud-embed:file-pick', {
        resource: JSON.parse(JSON.stringify(resource)),
        locationQuery: JSON.parse(JSON.stringify(routeToContextQuery(unref(router.currentRoute))))
      })
    }

    if (!event.shiftKey && !event.metaKey && !event.ctrlKey) {
      eventBus.publish('app.files.shiftAnchor.reset')
    }

    const eventTarget = event?.target as HTMLElement
    const contextActionClicked = eventTarget?.closest('div')?.id === 'oc-files-context-menu'
    if (contextActionClicked) {
      return
    }
    if (event && event.metaKey) {
      return eventBus.publish('app.files.list.clicked.meta', resource)
    }
    if (event && event.shiftKey) {
      return eventBus.publish('app.files.list.clicked.shift', {
        resource,
        skipTargetSelection: false
      })
    }

    const isCheckboxClicked = eventTarget.getAttribute('type') === 'checkbox'
    if (isCheckboxClicked) {
      return
    }

    if (isResourceSelected(resource)) {
      return
    }

    eventBus.publish('app.files.list.clicked')
    emit('update:selectedIds', [resource.id])
  }

  // file name link clicked
  const fileNameClicked = ({
    resource,
    event
  }: {
    resource: Resource
    event: MouseEvent | KeyboardEvent
  }) => {
    if (interceptModifierClick(event, resource)) {
      return
    }

    if (unref(isEmbedModeEnabled)) {
      if (!unref(isFilePicker)) {
        emit('update:selectedIds', [resource.id])
      }

      if (unref(isFilePicker) && !resource.isFolder) {
        return postMessage<embedModeFilePickMessageData>('opencloud-embed:file-pick', {
          resource: JSON.parse(JSON.stringify(resource)),
          locationQuery: JSON.parse(JSON.stringify(routeToContextQuery(unref(router.currentRoute))))
        })
      }

      return
    }

    emit('fileClick', { space: getMatchingSpace(resource), resources: [resource] })
  }

  // checkbox for a single file clicked
  const fileCheckboxClicked = ({
    resource,
    event
  }: {
    resource: Resource
    event: MouseEvent | KeyboardEvent
  }) => {
    if (interceptModifierClick(event, resource)) {
      return
    }
    resourcesStore.toggleSelection(resource.id)
    eventBus.publish('app.files.list.clicked')
    emit('update:selectedIds', [...resourcesStore.selectedIds])
  }

  return {
    selectedResources,
    isResourceSelected,
    isResourceInDeleteQueue,
    isResourceDisabled,
    fileContainerClicked,
    fileNameClicked,
    fileCheckboxClicked,
    ...useResourceViewDrag({ selectedIds, selectedResources, emit })
  }
}
