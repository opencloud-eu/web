import { onBeforeUnmount, onMounted, toValue, type MaybeRefOrGetter } from 'vue'
import { useEventListener } from '@vueuse/core'
import { TouchManager } from 'pdfjs-dist'
import { MAX_SCALE, MIN_SCALE } from '../helpers/pdfjs'

/** Ctrl + mouse wheel zoom and pinching on trackpads and touch screens, like the PDF.js viewer. */
export function usePdfZoomGestures({
  root,
  container,
  isPresenting,
  scale,
  zoomAt,
  panBy
}: {
  /** Also over the toolbar and the sidebar, the browser would zoom the whole page otherwise. */
  root: MaybeRefOrGetter<HTMLElement | null>
  container: MaybeRefOrGetter<HTMLElement | null>
  /** The presentation mode fits the pages itself, no zooming. */
  isPresenting: MaybeRefOrGetter<boolean>
  /** The current zoom, e.g. 1.25 for 125%. */
  scale: MaybeRefOrGetter<number>
  /** Zooms around a point on the screen, by zoom steps or by a factor, moving the pages along. */
  zoomAt: (
    change: { steps?: number; scaleFactor?: number },
    origin: [number, number],
    pan?: [number, number]
  ) => void
  panBy: (dx: number, dy: number) => void
}) {
  // Pinching on a trackpad also arrives as wheel events with the Ctrl key, but without pressing it.
  let isCtrlKeyDown = false

  // Pinching zooms continuously, a mouse wheel in zoom steps. The remainders add up, small
  // movements would be lost otherwise.
  let unusedTicks = 0
  const wheelFactor = { unused: 1 }
  const touchFactor = { unused: 1 }

  function accumulateTicks(ticks: number) {
    if (Math.sign(unusedTicks) === -Math.sign(ticks)) {
      unusedTicks = 0
    }
    unusedTicks += ticks
    const wholeTicks = Math.trunc(unusedTicks)
    unusedTicks -= wholeTicks
    return wholeTicks
  }

  function accumulateFactor(factor: number, remainder: { unused: number }) {
    const previousScale = toValue(scale)
    const target = Math.min(
      Math.max(previousScale * factor * remainder.unused, MIN_SCALE),
      MAX_SCALE
    )
    // PDF.js rounds the zoom to whole percents.
    const newScale = Math.round(target * 100) / 100
    remainder.unused = target / newScale
    return newScale / previousScale
  }

  function onWheel(event: WheelEvent) {
    if (toValue(isPresenting)) {
      return
    }
    const scaleFactor = Math.exp(-event.deltaY / 100)
    const isPinch =
      event.ctrlKey &&
      !isCtrlKeyDown &&
      event.deltaMode === WheelEvent.DOM_DELTA_PIXEL &&
      event.deltaX === 0 &&
      event.deltaZ === 0 &&
      Math.abs(scaleFactor - 1) < 0.05
    if (!isPinch && !event.ctrlKey && !event.metaKey) {
      return
    }
    event.preventDefault()
    const origin: [number, number] = [event.clientX, event.clientY]
    if (isPinch) {
      zoomAt({ scaleFactor: accumulateFactor(scaleFactor, wheelFactor) }, origin)
      return
    }
    // Upwards zooms in.
    const delta = -Math.sign(event.deltaY) * Math.hypot(event.deltaX, event.deltaY)
    const steps =
      event.deltaMode === WheelEvent.DOM_DELTA_PIXEL
        ? accumulateTicks(delta / 30)
        : Math.abs(delta) >= 1
          ? Math.sign(delta)
          : accumulateTicks(delta)
    if (steps) {
      zoomAt({ steps }, origin)
    }
  }

  // Pinching on touch screens zooms the pages instead of the whole browser page.
  const touchAbort = new AbortController()
  onMounted(() => {
    new TouchManager({
      container: toValue(container),
      isPinchingDisabled: () => toValue(isPresenting),
      onPinching: (
        origin: [number, number],
        prevDistance: number,
        distance: number,
        panX: number,
        panY: number
      ) => {
        const scaleFactor = accumulateFactor(distance / prevDistance, touchFactor)
        zoomAt({ scaleFactor }, origin, [panX, panY])
      },
      onPinchEnd: () => {
        touchFactor.unused = 1
      },
      onPanning: panBy,
      signal: touchAbort.signal
    })
  })
  onBeforeUnmount(() => touchAbort.abort())

  useEventListener(
    window,
    'keydown',
    (event: KeyboardEvent) => {
      if (event.key === 'Control') {
        isCtrlKeyDown = true
      }
    },
    { capture: true }
  )
  useEventListener(window, 'keyup', (event: KeyboardEvent) => {
    if (event.key === 'Control') {
      isCtrlKeyDown = false
    }
  })
  // The key may be released while another window has the focus.
  useEventListener(window, 'blur', () => (isCtrlKeyDown = false))
  useEventListener(root, 'wheel', onWheel, { passive: false })
}
