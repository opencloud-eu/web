import { computed, nextTick, onMounted, toValue, unref, watch, type MaybeRefOrGetter } from 'vue'
import { useVirtualList } from '@vueuse/core'

// Of a thumbnail card and the gap below it, the virtual list needs them in pixels.
export const THUMBNAIL_HEIGHT = 206
export const THUMBNAIL_GAP = 2
const ITEM_HEIGHT = THUMBNAIL_HEIGHT + THUMBNAIL_GAP
// Around the list (`p-2`).
const LIST_PADDING = 8

/**
 * The thumbnails of the sidebar as a virtual list, documents can be long. Keeps the current
 * page in view, like the thumbnails of the PDF.js viewer.
 */
export function usePdfThumbnailList({
  pageCount,
  pageNumber,
  isShown
}: {
  pageCount: MaybeRefOrGetter<number>
  pageNumber: MaybeRefOrGetter<number>
  isShown: MaybeRefOrGetter<boolean>
}) {
  const pages = computed(() => Array.from({ length: toValue(pageCount) }, (_, i) => i + 1))
  const { list, containerProps, wrapperProps } = useVirtualList(pages, {
    itemHeight: ITEM_HEIGHT,
    overscan: 4
  })

  function revealPage(page: number, block: 'center' | 'nearest') {
    const container = unref(containerProps.ref)
    if (!container) {
      return
    }
    const top = LIST_PADDING + (page - 1) * ITEM_HEIGHT
    const bottom = top + ITEM_HEIGHT
    if (block === 'center') {
      container.scrollTop = top - (container.clientHeight - ITEM_HEIGHT) / 2
      return
    }
    if (top - LIST_PADDING < container.scrollTop) {
      container.scrollTop = top - LIST_PADDING
    } else if (bottom + LIST_PADDING > container.scrollTop + container.clientHeight) {
      container.scrollTop = bottom + LIST_PADDING - container.clientHeight
    }
  }

  watch(
    () => toValue(pageNumber),
    (page) => revealPage(page, 'nearest')
  )

  onMounted(() => revealPage(toValue(pageNumber), 'center'))

  // While hidden, the list can't scroll.
  watch(
    () => toValue(isShown),
    async (shown) => {
      if (!shown) {
        return
      }
      await nextTick()
      revealPage(toValue(pageNumber), 'center')
    }
  )

  return { list, containerProps, wrapperProps }
}
