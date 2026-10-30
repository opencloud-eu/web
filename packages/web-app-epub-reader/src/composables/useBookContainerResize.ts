import { Location, Rendition } from 'epubjs'
import { throttle } from 'lodash-es'
import { onBeforeUnmount, Ref, unref, watch } from 'vue'

const THROTTLE_MS = 50

type BookContainerResizeOptions = {
  rendition: Ref<Rendition | undefined>
  location: Ref<Location | undefined>
  container: Ref<HTMLElement | undefined>
}

/**
 * epub.js only relayouts on window resize. This relayouts when the book container itself
 * changes size, e.g. when the details sidebar opens or closes. Observing starts with the first
 * displayed page, so the initial layout isn't interrupted.
 *
 * Like epub.js' own window resize handler, the first call runs right away: epub.js silently
 * adopts the new size on its next scroll or location report, after which resize() would be a
 * no-op and the pages would stay misaligned.
 */
export function useBookContainerResize({
  rendition,
  location,
  container
}: BookContainerResizeOptions) {
  let observer: ResizeObserver | undefined

  const resizeRendition = throttle(() => {
    // Without a size, epub.js re-measures the container like on window resize (the typings
    // wrongly mark both arguments as required). It's a no-op if the size didn't change.
    unref(rendition)?.resize(undefined, undefined)
  }, THROTTLE_MS)

  function stop() {
    resizeRendition.cancel()
    observer?.disconnect()
    observer = undefined
  }

  watch([rendition, location, container], ([currentRendition, currentLocation, element]) => {
    if (!currentRendition || !currentLocation || !element) {
      stop()
      return
    }
    if (observer) {
      return
    }
    observer = new ResizeObserver(() => resizeRendition())
    observer.observe(element)
  })

  onBeforeUnmount(stop)
}
