import { computed, ref, unref, type Ref, type ShallowRef } from 'vue'
import { useEventListener, useIdle } from '@vueuse/core'
import { AnnotationEditorType } from 'pdfjs-dist'
import {
  ScrollMode,
  SpreadMode,
  type EventBus,
  type PDFViewer
} from 'pdfjs-dist/web/pdf_viewer.mjs'

// PDF.js' PresentationModeState, PDFViewer adjusts its layout to it.
const PresentationModeState = { NORMAL: 1, CHANGING: 2, FULLSCREEN: 3 }
// Scrolled distance in pixels that turns a page, and the minimum length of a swipe.
const WHEEL_DISTANCE = 90
const SWIPE_DISTANCE = 50
const SWIPE_ANGLE = Math.PI / 6

type ViewState = {
  scaleValue: string
  scrollMode: number
  spreadMode: number
  editorMode: number
}

/**
 * Presentation mode like in the PDF.js viewer (whose PDFPresentationMode isn't part of the
 * components): the pages full screen one by one, turned by click, mouse wheel, keys or swipe.
 * Editing is off meanwhile, the view is restored afterwards.
 */
export function usePdfPresentationMode({
  container,
  viewer,
  eventBus
}: {
  container: Ref<HTMLElement | null>
  viewer: ShallowRef<PDFViewer | undefined>
  eventBus: EventBus
}) {
  const isSupported = !!document.fullscreenEnabled
  const state = ref(PresentationModeState.NORMAL)
  const isActive = computed(() => unref(state) !== PresentationModeState.NORMAL)
  // The mouse cursor hides when the mouse doesn't move.
  const { idle } = useIdle(3000)

  let savedView: ViewState
  let wheelDistance = 0
  let swipeStart: Touch | undefined
  let isContextMenuOpen = false

  function setState(value: number) {
    state.value = value
    // Like the PDF.js viewer app: PDFViewer fits each page then, its layers learn it by event.
    unref(viewer).presentationModeState = value
    eventBus.dispatch('presentationmodechanged', { source: null, state: value })
  }

  async function request() {
    const element = unref(container)
    const pdfViewer = unref(viewer)
    if (unref(isActive) || !element || !pdfViewer?.pagesCount) {
      return
    }
    // Typed as the setter's argument by PDF.js, the getter returns the mode.
    savedView = {
      scaleValue: pdfViewer.currentScaleValue,
      scrollMode: pdfViewer.scrollMode,
      spreadMode: pdfViewer.spreadMode,
      editorMode: pdfViewer.annotationEditorMode as unknown as number
    }
    wheelDistance = 0
    swipeStart = undefined
    isContextMenuOpen = false
    setState(PresentationModeState.CHANGING)
    try {
      await element.requestFullscreen()
      pdfViewer.focus()
    } catch {
      setState(PresentationModeState.NORMAL)
    }
  }

  // Like the PDF.js viewer: one page at a time, pages side by side only if they're all the same
  // size, without editing.
  function setView({ scaleValue, scrollMode, spreadMode, editorMode }: ViewState) {
    const pdfViewer = unref(viewer)
    const pageNumber = pdfViewer.currentPageNumber
    pdfViewer.scrollMode = scrollMode
    pdfViewer.spreadMode = spreadMode
    pdfViewer.currentScaleValue = scaleValue
    pdfViewer.currentPageNumber = pageNumber
    if (editorMode !== AnnotationEditorType.DISABLE) {
      pdfViewer.annotationEditorMode = { mode: editorMode }
    }
  }

  useEventListener(document, 'fullscreenchange', () => {
    if (unref(state) === PresentationModeState.CHANGING && document.fullscreenElement) {
      setState(PresentationModeState.FULLSCREEN)
      const { pageViewsReady, hasEqualPageSizes } = unref(viewer)
      // After the layout changed to full screen.
      setTimeout(() =>
        setView({
          scaleValue: 'page-fit',
          scrollMode: ScrollMode.PAGE,
          spreadMode: pageViewsReady && hasEqualPageSizes ? savedView.spreadMode : SpreadMode.NONE,
          editorMode:
            savedView.editorMode === AnnotationEditorType.DISABLE
              ? AnnotationEditorType.DISABLE
              : AnnotationEditorType.NONE
        })
      )
      document.getSelection()?.empty()
      return
    }
    if (isPresenting() && !document.fullscreenElement) {
      setState(PresentationModeState.NORMAL)
      setTimeout(() => setView(savedView))
    }
  })

  function isPresenting() {
    return unref(state) === PresentationModeState.FULLSCREEN
  }

  // Only while presenting, so that e.g. the non-passive wheel and touchmove listeners don't slow
  // down scrolling otherwise.
  function presentingTarget() {
    return isPresenting() ? window : undefined
  }

  function turnPage(isBack: boolean) {
    return isBack ? unref(viewer).previousPage() : unref(viewer).nextPage()
  }

  // A click turns to the next page, with Shift to the previous one. Links within the document
  // still work, the first click after the context menu only closes it.
  useEventListener(presentingTarget, 'contextmenu', () => {
    isContextMenuOpen = true
  })
  useEventListener(presentingTarget, 'mousedown', (event: MouseEvent) => {
    if (isContextMenuOpen) {
      isContextMenuOpen = false
      event.preventDefault()
      return
    }
    if (event.button !== 0 || (event.target as Element).closest?.('a')) {
      return
    }
    event.preventDefault()
    turnPage(event.shiftKey)
  })

  useEventListener(
    presentingTarget,
    'wheel',
    (event: WheelEvent) => {
      event.preventDefault()
      // Also sideways, e.g. on trackpads.
      const deltaPixels =
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
      const delta = event.deltaMode === WheelEvent.DOM_DELTA_PIXEL ? deltaPixels : deltaPixels * 30
      // A change of direction starts over.
      wheelDistance = Math.sign(delta) === Math.sign(wheelDistance) ? wheelDistance + delta : delta
      if (Math.abs(wheelDistance) >= WHEEL_DISTANCE) {
        turnPage(wheelDistance < 0)
        wheelDistance = 0
      }
    },
    { passive: false }
  )

  // Keys turn pages themselves, a wheel movement starts over.
  useEventListener(presentingTarget, 'keydown', () => {
    wheelDistance = 0
  })

  // A swipe to the left or up turns to the next page, to the right or down to the previous one.
  // Diagonal ones (more than 30° off) don't, like in the PDF.js viewer.
  useEventListener(presentingTarget, 'touchstart', (event: TouchEvent) => {
    swipeStart = event.touches.length === 1 ? event.touches[0] : undefined
  })
  useEventListener(
    presentingTarget,
    'touchmove',
    (event: TouchEvent) => {
      if (swipeStart) {
        event.preventDefault()
      }
    },
    { passive: false }
  )
  useEventListener(presentingTarget, 'touchend', (event: TouchEvent) => {
    const end = event.changedTouches[0]
    if (!swipeStart || !end) {
      return
    }
    const dx = end.pageX - swipeStart.pageX
    const dy = end.pageY - swipeStart.pageY
    const [delta, offAxis] = Math.abs(dx) > Math.abs(dy) ? [dx, dy] : [dy, dx]
    const isStraight = Math.abs(offAxis) <= Math.abs(delta) * Math.tan(SWIPE_ANGLE)
    if (Math.abs(delta) >= SWIPE_DISTANCE && isStraight) {
      turnPage(delta > 0)
    }
    swipeStart = undefined
  })

  // For the container, like the PDF.js viewer: black around the pages, an arrow cursor only
  // while the mouse moves, annotations and form fields don't take clicks except links within the
  // document. Important to win against pdf_viewer.css, which isn't in a cascade layer.
  const containerClasses = computed(() => {
    if (!unref(isActive)) {
      return undefined
    }
    return [
      // PDF.js' own layout for it, e.g. pages without their margin.
      'pdfPresentationMode bg-black overflow-hidden select-none',
      '[&_section:not([data-internal-link])]:pointer-events-none!',
      unref(idle) ? 'cursor-none! [&_*]:cursor-none!' : '[&_.textLayer_span]:cursor-default!'
    ]
  })

  return { isSupported, isActive, containerClasses, request }
}
