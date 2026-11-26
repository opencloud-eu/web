import { computed, nextTick, ref, unref, type Ref } from 'vue'
import { getComposableWrapper } from '@opencloud-eu/web-test-helpers'
import { usePdfThumbnailList } from '../../../src/composables/usePdfThumbnailList'

// happy-dom has no layout, the scroll position is what counts.
vi.mock('@vueuse/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@vueuse/core')>()),
  useVirtualList: (source: Ref<number[]>) => ({
    list: computed(() => unref(source).map((data, index) => ({ data, index }))),
    containerProps: { ref: ref<HTMLElement>() },
    wrapperProps: computed(() => ({}))
  })
}))

function setup({ pageNumber = 2, isShown = true } = {}) {
  const page = ref(pageNumber)
  const shown = ref(isShown)
  const container = document.createElement('div')
  Object.defineProperty(container, 'clientHeight', { value: 416 })
  let thumbnails: ReturnType<typeof usePdfThumbnailList>
  getComposableWrapper(() => {
    thumbnails = usePdfThumbnailList({ pageCount: 30, pageNumber: page, isShown: shown })
    thumbnails.containerProps.ref.value = container
  })
  return { thumbnails, page, shown, container }
}

describe('usePdfThumbnailList', () => {
  it('lists all pages', () => {
    const { thumbnails } = setup()
    expect(thumbnails.list.value).toHaveLength(30)
  })

  it('centers the current page when mounted and when shown again', async () => {
    const { container, shown } = setup({ pageNumber: 10, isShown: false })
    // Cards are 208px each, the list has 8px around it.
    expect(container.scrollTop).toBe(8 + 9 * 208 - (416 - 208) / 2)
    container.scrollTop = 0
    shown.value = true
    await nextTick()
    await nextTick()
    expect(container.scrollTop).toBe(8 + 9 * 208 - (416 - 208) / 2)
  })

  // Like the thumbnails of the PDF.js viewer, also for pages not shown yet.
  it('scrolls the current page into view', async () => {
    const { container, page } = setup()
    page.value = 20
    await nextTick()
    // Page 20 ends at the bottom of the visible area.
    expect(container.scrollTop).toBe(8 + 20 * 208 + 8 - 416)
    // Page 19 starts just above it, it gets fully into view.
    page.value = 19
    await nextTick()
    expect(container.scrollTop).toBe(8 + 18 * 208 - 8)
    page.value = 1
    await nextTick()
    expect(container.scrollTop).toBe(0)
  })
})
