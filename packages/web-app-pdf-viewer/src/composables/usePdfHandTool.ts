import { computed, ref, toValue, unref, type MaybeRefOrGetter, type Ref } from 'vue'
import { useEventListener } from '@vueuse/core'

// Clicks on these still do what they do, like in the PDF.js viewer's GrabToPan.
const IGNORED_TARGETS = 'a[href], a[href] *, input, textarea, button, button *, select, option'

/**
 * The hand tool of the PDF.js viewer: dragging moves the pages instead of selecting text. It
 * stays chosen, but pauses while an annotation tool is active or the pages are presented.
 */
export function usePdfHandTool({
  container,
  isToolActive,
  isPresenting,
  leaveTool
}: {
  container: Ref<HTMLElement | null>
  /** An annotation tool is active. */
  isToolActive: MaybeRefOrGetter<boolean>
  isPresenting: MaybeRefOrGetter<boolean>
  leaveTool: () => void
}) {
  const isChosen = ref(false)
  const isActive = computed(
    () => unref(isChosen) && !toValue(isToolActive) && !toValue(isPresenting)
  )

  // Choosing it leaves an annotation tool, like choosing another tool does.
  function setChosen(value: boolean) {
    if (value && toValue(isToolActive)) {
      leaveTool()
    }
    isChosen.value = value
  }

  const isGrabbing = ref(false)

  let start: { x: number; y: number; left: number; top: number } | undefined

  function endPan() {
    start = undefined
    isGrabbing.value = false
  }

  useEventListener(
    container,
    'mousedown',
    (event: MouseEvent) => {
      const element = unref(container)
      if (
        !unref(isActive) ||
        event.button !== 0 ||
        (event.target as Element).matches?.(IGNORED_TARGETS)
      ) {
        return
      }
      start = {
        x: event.clientX,
        y: event.clientY,
        left: element.scrollLeft,
        top: element.scrollTop
      }
      // No text selection, the focus leaves what had it.
      event.preventDefault()
      event.stopPropagation()
      const focused = document.activeElement as HTMLElement | null
      if (focused && !focused.contains(event.target as Node)) {
        focused.blur()
      }
    },
    { capture: true }
  )

  useEventListener(
    document,
    'mousemove',
    (event: MouseEvent) => {
      if (!start) {
        return
      }
      if (!(event.buttons & 1)) {
        endPan()
        return
      }
      isGrabbing.value = true
      unref(container)?.scrollTo({
        left: start.left - (event.clientX - start.x),
        top: start.top - (event.clientY - start.y),
        behavior: 'instant'
      })
    },
    { capture: true }
  )
  useEventListener(document, 'mouseup', endPan, { capture: true })

  // For the container, like the PDF.js viewer's CSS: the hand everywhere but on form fields and
  // links. Important to win against pdf_viewer.css, which isn't in a cascade layer.
  const containerClasses = computed(() => {
    if (!unref(isActive)) {
      return undefined
    }
    return [
      unref(isGrabbing) ? 'cursor-grabbing!' : 'cursor-grab!',
      '[&_*:not(input,textarea,button,select,:link)]:[cursor:inherit]!'
    ]
  })

  return { isActive, containerClasses, setChosen }
}
