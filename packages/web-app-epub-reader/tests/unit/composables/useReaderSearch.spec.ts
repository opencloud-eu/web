import { flushPromises } from '@vue/test-utils'
import { EpubCFI } from 'epubjs'
import { shallowRef, unref } from 'vue'
import { useReaderSearch } from '../../../src/composables/useReaderSearch'
import { createBookMock, createSpineItemMock, mountComposable, SpineItemMock } from '../mocks'

function setup(spineItems: SpineItemMock[]) {
  const bookMock = createBookMock({ spineItems })
  const book = shallowRef(bookMock as any)
  const rendition = shallowRef(bookMock.rendition as any)
  const { result } = mountComposable(() => useReaderSearch({ book, rendition }))
  return { result, book, rendition, bookMock }
}

describe('useReaderSearch', () => {
  it('collects the matches of all spine items and shows the first one', async () => {
    const one = createSpineItemMock('c1', 0, [{ cfi: 'cfi-1' }, { cfi: 'cfi-2' }])
    const two = createSpineItemMock('c2', 1, [{ cfi: 'cfi-3' }, {}])
    const { result, bookMock } = setup([one, two])

    await result.search('whale')

    expect(one.load).toHaveBeenCalled()
    expect(one.find).toHaveBeenCalledWith('whale')
    expect(one.unload).toHaveBeenCalled()
    expect(two.unload).toHaveBeenCalled()
    expect(unref(result.resultCfis)).toEqual(['cfi-1', 'cfi-2', 'cfi-3'])
    expect(unref(result.hasMoreResults)).toBe(false)
    expect(unref(result.currentResultIndex)).toBe(0)
    expect(unref(result.isSearching)).toBe(false)
    expect(bookMock.rendition.display).toHaveBeenCalledWith('cfi-1')
    expect(bookMock.rendition.annotations.highlight).toHaveBeenCalledWith(
      'cfi-1',
      {},
      undefined,
      'epub-reader-search-highlight',
      { fill: 'var(--color-yellow-500)', 'fill-opacity': '0.35' }
    )
  })

  it('skips spine items that fail to load or search', async () => {
    const broken = createSpineItemMock('c1', 0)
    broken.load.mockRejectedValue(new Error('broken'))
    const { result } = setup([broken, createSpineItemMock('c2', 1, [{ cfi: 'cfi-2' }])])

    await result.search('whale')

    expect(broken.unload).toHaveBeenCalled()
    expect(unref(result.resultCfis)).toEqual(['cfi-2'])
    expect(unref(result.isSearching)).toBe(false)
  })

  it('does not highlight a result of a search that was closed while displaying it', async () => {
    const { result, bookMock } = setup([
      createSpineItemMock('c1', 0, [{ cfi: 'cfi-1' }, { cfi: 'cfi-2' }])
    ])
    await result.search('whale')
    let resolveDisplay: () => void = () => {}
    bookMock.rendition.display.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveDisplay = resolve
        })
    )

    const next = result.goToNextResult()
    result.closeSearch()
    resolveDisplay()
    await next

    expect(bookMock.rendition.annotations.highlight).toHaveBeenCalledTimes(1)
    expect(bookMock.rendition.annotations.highlight).toHaveBeenCalledWith(
      'cfi-1',
      expect.anything(),
      undefined,
      expect.any(String),
      expect.anything()
    )
  })

  it('drops a highlight that epub.js cannot render', async () => {
    const { result, bookMock } = setup([createSpineItemMock('c1', 0, [{ cfi: 'cfi-1' }])])
    bookMock.rendition.annotations.highlight.mockImplementation(() => {
      throw new TypeError("Cannot read properties of null (reading 'getClientRects')")
    })

    await result.search('whale')

    expect(bookMock.rendition.annotations.remove).toHaveBeenCalledWith('cfi-1', 'highlight')
    expect(unref(result.currentResultIndex)).toBe(0)
  })

  it('ignores matches outside the body, e.g. in the document title', async () => {
    const doc = new DOMParser().parseFromString(
      '<html><head><title>whale</title></head><body><p>a whale</p></body></html>',
      'text/html'
    )
    const titleCfi = 'epubcfi(/6/2!/2/2/1:0)'
    const bodyCfi = 'epubcfi(/6/2!/4/2/1:0)'
    const nodes: Record<string, Node> = {
      [titleCfi]: doc.querySelector('title').firstChild,
      [bodyCfi]: doc.querySelector('p').firstChild
    }
    // the test DOM can't resolve real CFIs, so map the fake ones to their nodes
    const toRange = vi.spyOn(EpubCFI.prototype, 'toRange').mockImplementation(function (this: {
      str: string
    }) {
      const range = doc.createRange()
      range.setStart(nodes[this.str], 0)
      return range
    })
    const section = {
      ...createSpineItemMock('c1', 0, [{ cfi: titleCfi }, { cfi: bodyCfi }]),
      document: doc
    }
    const { result } = setup([section as any])

    await result.search('whale')

    expect(unref(result.resultCfis)).toEqual([bodyCfi])
    toRange.mockRestore()
  })

  it('caps the results', async () => {
    const matches = Array.from({ length: 301 }, (_, i) => ({ cfi: `cfi-${i}` }))
    const { result } = setup([createSpineItemMock('c1', 0, matches), createSpineItemMock('c2', 1)])

    await result.search('e')

    expect(unref(result.resultCfis)).toHaveLength(300)
    expect(unref(result.hasMoreResults)).toBe(true)
  })

  it('navigates through the results and wraps around', async () => {
    const { result, bookMock } = setup([
      createSpineItemMock('c1', 0, [{ cfi: 'cfi-1' }, { cfi: 'cfi-2' }, { cfi: 'cfi-3' }])
    ])
    await result.search('whale')

    await result.goToNextResult()
    expect(bookMock.rendition.display).toHaveBeenLastCalledWith('cfi-2')
    expect(bookMock.rendition.annotations.remove).toHaveBeenCalledWith('cfi-1', 'highlight')

    await result.goToPreviousResult()
    await result.goToPreviousResult()
    expect(bookMock.rendition.display).toHaveBeenLastCalledWith('cfi-3')

    await result.goToNextResult()
    expect(bookMock.rendition.display).toHaveBeenLastCalledWith('cfi-1')
    expect(unref(result.currentResultIndex)).toBe(0)
  })

  it('clears the results and the highlight when closed', async () => {
    const { result, bookMock } = setup([createSpineItemMock('c1', 0, [{ cfi: 'cfi-1' }])])
    await result.search('whale')

    result.closeSearch()

    expect(unref(result.resultCfis)).toEqual([])
    expect(unref(result.currentResultIndex)).toBe(-1)
    expect(unref(result.canNavigateThroughResults)).toBe(false)
    expect(bookMock.rendition.annotations.remove).toHaveBeenCalledWith('cfi-1', 'highlight')
  })

  it('drops the results of a search that was superseded', async () => {
    let resolveLoad: () => void = () => {}
    const slow = createSpineItemMock('c1', 0, [{ cfi: 'slow' }])
    slow.load.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveLoad = resolve
        })
    )
    const { result, bookMock } = setup([slow])

    const first = result.search('whale')
    const fast = result.search('')
    resolveLoad()
    await Promise.all([first, fast])
    await flushPromises()

    expect(unref(result.resultCfis)).toEqual([])
    expect(unref(result.isSearching)).toBe(false)
    expect(bookMock.rendition.display).not.toHaveBeenCalled()
  })

  it('resets when the book changes', async () => {
    const { result, book } = setup([createSpineItemMock('c1', 0, [{ cfi: 'cfi-1' }])])
    await result.search('whale')

    book.value = createBookMock() as any
    await flushPromises()

    expect(unref(result.resultCfis)).toEqual([])
  })
})
