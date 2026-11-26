import { ComponentPublicInstance, computed, nextTick, Ref, ref, unref, useTemplateRef } from 'vue'
import { useResourcesStore } from '../piniaStores'
import { useGetMatchingSpace } from '../spaces'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import ResourceGhostElement from '../../components/FilesList/ResourceGhostElement.vue'

/**
 * Data type that marks drags of resources out of a resource view, so drop targets can tell them
 * apart from other drags (like files from the operating system).
 */
export const resourceDragDataType = 'application/x-opencloud-resources'

export function isResourceDrag(event: DragEvent) {
  return (event.dataTransfer?.types || []).includes(resourceDragDataType)
}

export const useResourceViewDrag = ({
  selectedIds,
  resources,
  space = ref<SpaceResource>(),
  emit,
  isDragEnabled = ref(true),
  isDropEnabled = ref(true)
}: {
  selectedIds: Ref<string[]>
  resources: Ref<Resource[]>
  /**
   * The space of the resource view, if the view shows the resources of one space.
   */
  space?: Ref<SpaceResource>
  emit: ReturnType<typeof defineEmits>
  /**
   * Whether resources can be dragged.
   */
  isDragEnabled?: Ref<boolean>
  /**
   * Whether resources are drop targets for dragged resources. Dragging itself is not affected.
   */
  isDropEnabled?: Ref<boolean>
}) => {
  const resourcesStore = useResourcesStore()
  const { getMatchingSpace } = useGetMatchingSpace()

  const dragItem = ref<Resource>()
  const ghostElement =
    useTemplateRef<ComponentPublicInstance<typeof ResourceGhostElement>>('ghostElement')

  const setDragItem = async (item: Resource, event: DragEvent) => {
    dragItem.value = item
    await nextTick()
    // the drag can end or the view can unmount before the ghost got rendered
    const el = unref(ghostElement)?.$el
    if (!el || unref(dragItem)?.id !== item.id) {
      return
    }
    el.ariaHidden = 'true'
    el.style.left = '-99999px'
    el.style.top = '-99999px'
    event.dataTransfer.setDragImage(el, 0, 0)
    event.dataTransfer.dropEffect = 'move'
    event.dataTransfer.effectAllowed = 'move'
  }

  // the dragged resource and the selection it belongs to, for drop targets outside of the view
  function setResourceDrag(resource: Resource, event: DragEvent) {
    const selectedIdsSet = new Set(unref(selectedIds))
    const draggedResources = selectedIdsSet.has(resource.id)
      ? unref(resources).filter(({ id }) => selectedIdsSet.has(id))
      : [resource]

    event.dataTransfer.setData(resourceDragDataType, draggedResources.map(({ id }) => id).join())
    resourcesStore.setResourceDrag({
      resources: draggedResources,
      space: unref(space) || getMatchingSpace(resource)
    })
    // dragend fires on the drag source, also after a drop or when the drag gets cancelled
    event.target?.addEventListener('dragend', dragEnd, { once: true })
  }

  function dragEnd() {
    // removes the ghost element, it's only needed while dragging
    dragItem.value = null
    resourcesStore.setResourceDrag(null)
  }

  const dragStart = async (resource: Resource, event: DragEvent) => {
    // only the row or tile itself is a drag source. children that are draggable by default (like
    // images and links) start a native drag with their own data, which must never become a
    // resource drag. they get draggable="false", anything missed is cancelled here.
    if (!unref(isDragEnabled) || event.target !== event.currentTarget) {
      event.preventDefault()
      return
    }
    // must happen synchronously, the drag data can't be changed after the dragstart event
    setResourceDrag(resource, event)
    if (!unref(selectedIds).includes(resource.id)) {
      resourcesStore.setSelection([resource.id])
      emit('update:selectedIds', [resource.id])
    }
    await setDragItem(resource, event)
  }

  const dragSelection = computed(() => {
    const selectedIdsSet = new Set(unref(selectedIds))
    const draggedId = unref(dragItem)?.id
    return unref(resources).filter(({ id }) => selectedIdsSet.has(id) && id !== draggedId)
  })

  const getFileDropPayload = (event: DragEvent) => {
    return (event.dataTransfer.types || []).some((e) => e === 'Files')
  }

  const fileDropped = (resource: Resource, event: DragEvent) => {
    if (!unref(isDropEnabled) || getFileDropPayload(event)) {
      return
    }
    dragItem.value = null
    setDropStyling(resource, true, event)
    emit('fileDropped', resource.id)
  }

  const setDropStyling = (resource: Resource, leaving: boolean, event: DragEvent) => {
    if (!unref(isDropEnabled) || getFileDropPayload(event)) {
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
