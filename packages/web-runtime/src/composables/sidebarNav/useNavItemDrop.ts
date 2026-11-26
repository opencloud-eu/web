import {
  computed,
  MaybeRefOrGetter,
  nextTick,
  onBeforeUnmount,
  Ref,
  ref,
  toValue,
  unref
} from 'vue'
import { hideElementTooltip, showElementTooltip } from '@opencloud-eu/design-system/helpers'
import { AppNavigationItemDrop } from '@opencloud-eu/web-pkg'

/**
 * Makes a navigation item a drop target via its optional drop hook: highlights it for allowed drags
 * and explains via tooltip why other drags can't be dropped.
 */
export function useNavItemDrop({
  drop,
  navItem
}: {
  drop: MaybeRefOrGetter<AppNavigationItemDrop>
  navItem: Ref<HTMLElement>
}) {
  const isDropTargetActive = ref(false)
  // explains why a drag can't be dropped, hover tooltips don't work while dragging
  const dropHint = ref('')

  async function showDropHint(message: string) {
    if (unref(dropHint) === message) {
      return
    }
    dropHint.value = message
    // the tooltip directive picks up the new text on the next render
    await nextTick()
    showElementTooltip(unref(navItem))
  }

  function hideDropHint() {
    if (!unref(dropHint)) {
      return
    }
    hideElementTooltip(unref(navItem))
    dropHint.value = ''
  }

  // a drag can end without leaving the item (e.g. cancelled via Escape), dragend fires at the drag
  // source and bubbles up to the document. a new drag can also start without leaving the item.
  function listenForDragEnd() {
    document.addEventListener('dragend', resetDropState)
    document.addEventListener('dragstart', resetDropState)
  }

  function resetDropState() {
    document.removeEventListener('dragend', resetDropState)
    document.removeEventListener('dragstart', resetDropState)
    isDropTargetActive.value = false
    hideDropHint()
  }

  function onDragOver(event: DragEvent) {
    const dropHook = toValue(drop)
    if (!dropHook.isAllowed(event)) {
      // the hook can refuse a drag it allowed before (e.g. depending on modifier keys)
      isDropTargetActive.value = false
      const message = dropHook.notAllowedMessage?.(event)
      if (message) {
        listenForDragEnd()
        showDropHint(message)
      }
      return
    }
    hideDropHint()
    // allows the drop, otherwise the browser shows the "not allowed" cursor
    event.preventDefault()
    listenForDragEnd()
    isDropTargetActive.value = true
  }

  function onDragLeave(event: DragEvent) {
    if ((event.currentTarget as HTMLElement).contains(event.relatedTarget as HTMLElement)) {
      return
    }
    resetDropState()
  }

  function onDrop(event: DragEvent) {
    resetDropState()
    const dropHook = toValue(drop)
    if (!dropHook.isAllowed(event)) {
      return
    }
    event.preventDefault()
    dropHook.handler(event)
  }

  const dropListeners = computed(() => {
    if (!toValue(drop)) {
      return {}
    }
    return { dragenter: onDragOver, dragover: onDragOver, dragleave: onDragLeave, drop: onDrop }
  })

  onBeforeUnmount(resetDropState)

  return { isDropTargetActive, dropHint, dropListeners }
}
