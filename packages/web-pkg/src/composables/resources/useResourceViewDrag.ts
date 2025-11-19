import { ComponentPublicInstance, computed, nextTick, Ref, ref, unref, useTemplateRef } from 'vue'
import { useResourcesStore } from '../piniaStores'
import { Resource } from '@opencloud-eu/web-client'
import ResourceGhostElement from '../../components/FilesList/ResourceGhostElement.vue'

export const useResourceViewDrag = ({
  selectedIds,
  selectedResources,
  emit
}: {
  selectedIds: Ref<string[]>
  selectedResources: Ref<Resource[]>
  emit: (...args: any[]) => void
}) => {
  const resourcesStore = useResourcesStore()

  const dragItem = ref<Resource>()
  const ghostElement =
    useTemplateRef<ComponentPublicInstance<typeof ResourceGhostElement>>('ghostElement')

  const setDragItem = async (item: Resource, event: DragEvent) => {
    dragItem.value = item
    await nextTick()
    unref(ghostElement).$el.ariaHidden = 'true'
    unref(ghostElement).$el.style.left = '-99999px'
    unref(ghostElement).$el.style.top = '-99999px'
    event.dataTransfer.setDragImage(unref(ghostElement).$el, 0, 0)
    event.dataTransfer.dropEffect = 'move'
    event.dataTransfer.effectAllowed = 'move'
  }

  const dragStart = async (resource: Resource, event: DragEvent) => {
    if (!unref(selectedIds).includes(resource.id)) {
      resourcesStore.toggleSelection(resource.id)
      emit('update:selectedIds', [...resourcesStore.selectedIds])
    }
    await setDragItem(resource, event)
  }

  const dragSelection = computed(() => {
    return unref(selectedResources).filter(({ id }) => id !== unref(dragItem)?.id)
  })

  const getFileDropPayload = (event: DragEvent) => {
    return (event.dataTransfer.types || []).some((e) => e === 'Files')
  }

  const fileDropped = (resource: Resource, event: DragEvent) => {
    if (getFileDropPayload(event)) {
      return
    }
    dragItem.value = null
    setDropStyling(resource, true, event)
    emit('fileDropped', resource.id)
  }

  const setDropStyling = (resource: Resource, leaving: boolean, event: DragEvent) => {
    if (getFileDropPayload(event)) {
      return
    }
    if ((event.currentTarget as HTMLElement)?.contains(event.relatedTarget as HTMLElement)) {
      return
    }
    if (unref(selectedIds).includes(resource.id) || resource.type !== 'folder') {
      return
    }

    const el = document.querySelectorAll(`[data-item-id='${resource.id}']`)?.[0]
    if (!el) {
      return
    }

    const className = '!bg-role-secondary-container'
    leaving ? el.classList.remove(className) : el.classList.add(className)
  }

  return {
    ghostElement,
    dragItem,
    dragSelection,
    dragStart,
    fileDropped,
    setDropStyling
  }
}
