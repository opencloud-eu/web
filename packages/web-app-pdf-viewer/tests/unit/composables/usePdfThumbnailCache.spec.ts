import { usePdfThumbnailCache } from '../../../src/composables/usePdfThumbnailCache'

describe('usePdfThumbnailCache', () => {
  it('keeps the images of the pages at their new numbers after a page action', () => {
    const cache = usePdfThumbnailCache()
    const [first, second, third] = [new Blob(['1']), new Blob(['2']), new Blob(['3'])]
    cache.set(1, 0, first)
    cache.set(2, 0, second)
    cache.set(3, 0, third)
    // The first page was moved behind the second, the third deleted, a new page added.
    cache.remap([2, 1, undefined])
    expect(cache.get(1, 0)).toBe(second)
    expect(cache.get(2, 0)).toBe(first)
    expect(cache.get(3, 0)).toBeUndefined()
  })

  it('only has the images of the current rotation', () => {
    const cache = usePdfThumbnailCache()
    cache.set(1, 0, new Blob(['1']))
    expect(cache.get(1, 90)).toBeUndefined()
    const turned = new Blob(['turned'])
    cache.set(2, 90, turned)
    expect(cache.get(1, 0)).toBeUndefined()
    expect(cache.get(2, 90)).toBe(turned)
  })
})
