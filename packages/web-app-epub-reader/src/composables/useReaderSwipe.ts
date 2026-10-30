import { Rendition } from 'epubjs'
import { Ref, watch } from 'vue'

const MIN_DISTANCE_PX = 50
const MAX_DURATION_MS = 800

type ReaderSwipeOptions = {
  rendition: Ref<Rendition | undefined>
  onSwipeLeft: () => void
  onSwipeRight: () => void
}

/**
 * Horizontal swipes on the book turn pages. Touches happen inside the book's iframe, where
 * neither vueuse's `useSwipe` nor a listener on the container sees them, so this works on the
 * touch events epub.js forwards from the iframe.
 */
export function useReaderSwipe({ rendition, onSwipeLeft, onSwipeRight }: ReaderSwipeOptions) {
  let start: { x: number; y: number; time: number } | undefined

  function onTouchStart(event: TouchEvent) {
    const touch = event.changedTouches[0]
    if (!touch) {
      return
    }
    start = { x: touch.clientX, y: touch.clientY, time: event.timeStamp }
  }

  function onTouchEnd(event: TouchEvent) {
    const touch = event.changedTouches[0]
    if (!start || !touch) {
      return
    }
    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y
    const duration = event.timeStamp - start.time
    start = undefined

    const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY) * 1.5
    if (!isHorizontal || Math.abs(deltaX) < MIN_DISTANCE_PX || duration > MAX_DURATION_MS) {
      return
    }
    if (deltaX < 0) {
      onSwipeLeft()
      return
    }
    onSwipeRight()
  }

  watch(
    rendition,
    (currentRendition) => {
      start = undefined
      currentRendition?.on('touchstart', onTouchStart)
      currentRendition?.on('touchend', onTouchEnd)
    },
    { immediate: true }
  )
}
