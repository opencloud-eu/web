import { flushPromises } from '@vue/test-utils'
import { unref } from 'vue'
import { Location } from 'epubjs'
import { useEpubBook } from '../../../src/composables/useEpubBook'
import {
  BookMock,
  createBookMock,
  createLocation,
  createSpineItemMock,
  mountComposable,
  SpineItemMock
} from '../mocks'

const books: BookMock[] = []
const nextBook = vi.hoisted(() => ({
  rejectReady: false,
  rejectFirstDisplay: false,
  spineItems: undefined as SpineItemMock[] | undefined,
  currentLocation: undefined as Location | undefined
}))
vi.mock('epubjs', () => ({
  default: vi.fn(() => {
    const book = createBookMock({
      spineItems: nextBook.spineItems || [
        createSpineItemMock('cover.xhtml', 0),
        createSpineItemMock('c1.xhtml', 1)
      ]
    })
    if (nextBook.rejectReady) {
      book.ready = Promise.reject(new Error('not an epub'))
    }
    if (nextBook.rejectFirstDisplay) {
      book.rendition.display.mockRejectedValueOnce(new Error('No Section Found'))
    }
    book.rendition.currentLocation.mockReturnValue(nextBook.currentLocation)
    books.push(book)
    return book
  }),
  // cfis in these tests are 'cfi-<number>'
  EpubCFI: class {
    compare(a: string, b: string) {
      return Number(a.replace('cfi-', '')) - Number(b.replace('cfi-', ''))
    }
  }
}))

describe('useEpubBook', () => {
  beforeEach(() => {
    books.length = 0
    nextBook.rejectReady = false
    nextBook.rejectFirstDisplay = false
    nextBook.spineItems = undefined
    nextBook.currentLocation = undefined
  })

  it('renders the book into the container at the initial location', async () => {
    const { result } = mountComposable(() => useEpubBook())
    const container = document.createElement('div')

    await result.open('content', { container, initialCfi: 'epubcfi(/6/4!/4/2/1:0)' })

    expect(books).toHaveLength(1)
    expect(books[0].renderTo).toHaveBeenCalledWith(
      container,
      expect.objectContaining({ flow: 'paginated' })
    )
    expect(books[0].rendition.display).toHaveBeenCalledWith('epubcfi(/6/4!/4/2/1:0)')
    expect(unref(result.book)).toBe(books[0])
    expect(unref(result.rendition)).toBe(books[0].rendition)
  })

  it('tracks the reported location and the loading state', async () => {
    const { result } = mountComposable(() => useEpubBook())
    await result.open('content', { container: document.createElement('div') })
    expect(unref(result.isLoading)).toBe(true)

    const location = createLocation({}, { atStart: true })
    books[0].rendition.emit('relocated', location)

    expect(unref(result.isLoading)).toBe(false)
    expect(unref(result.location)).toBe(location)
    expect(unref(result.atStart)).toBe(true)
    expect(unref(result.atEnd)).toBe(false)
  })

  it('destroys the previous book when another one is opened', async () => {
    const { result } = mountComposable(() => useEpubBook())
    await result.open('one', { container: document.createElement('div') })
    books[0].rendition.emit('relocated', createLocation())

    await result.open('two', { container: document.createElement('div') })

    expect(books[0].rendition.destroy).toHaveBeenCalled()
    expect(books[0].destroy).toHaveBeenCalled()
    expect(unref(result.book)).toBe(books[1])
    expect(unref(result.location)).toBeUndefined()
    expect(unref(result.isLoading)).toBe(true)
  })

  it('does not render a book that was superseded while loading', async () => {
    const { result } = mountComposable(() => useEpubBook())
    const first = result.open('one', { container: document.createElement('div') })
    const second = result.open('two', { container: document.createElement('div') })
    await Promise.all([first, second])
    await flushPromises()

    expect(books[0].renderTo).not.toHaveBeenCalled()
    expect(books[0].destroy).toHaveBeenCalled()
    expect(books[1].renderTo).toHaveBeenCalled()
  })

  it('destroys a superseded book only once it is ready', async () => {
    const { result } = mountComposable(() => useEpubBook())
    let resolveReady: () => void = () => {}
    const first = result.open('one', { container: document.createElement('div') })
    books[0].ready = new Promise<void>((resolve) => {
      resolveReady = resolve
    })
    result.close()
    await flushPromises()
    expect(books[0].destroy).not.toHaveBeenCalled()

    resolveReady()
    await flushPromises()
    await first
    expect(books[0].destroy).toHaveBeenCalled()
  })

  it('destroys the book on unmount', async () => {
    const { result, wrapper } = mountComposable(() => useEpubBook())
    await result.open('content', { container: document.createElement('div') })

    wrapper.unmount()
    await flushPromises()

    expect(books[0].rendition.destroy).toHaveBeenCalled()
    expect(books[0].destroy).toHaveBeenCalled()
  })

  it('reports a book that cannot be opened', async () => {
    const { result } = mountComposable(() => useEpubBook())
    nextBook.rejectReady = true
    await result.open('content', { container: document.createElement('div') })
    await flushPromises()

    expect(unref(result.loadError)?.message).toBe('not an epub')
    expect(unref(result.isLoading)).toBe(false)
    expect(books[0].renderTo).not.toHaveBeenCalled()
  })

  it('falls back to the beginning when the stored position cannot be displayed', async () => {
    const { result } = mountComposable(() => useEpubBook())
    nextBook.rejectFirstDisplay = true
    await result.open('content', { container: document.createElement('div'), initialCfi: 'stale' })

    expect(books[0].rendition.display).toHaveBeenLastCalledWith('cover.xhtml')
    expect(unref(result.loadError)).toBeUndefined()
  })

  it('starts at the first renderable spine item', async () => {
    const { result } = mountComposable(() => useEpubBook())
    nextBook.spineItems = [
      createSpineItemMock('cover.jpg', 0, [], { type: 'image/jpeg' }),
      createSpineItemMock('extra.xhtml', 1, [], { linear: false }),
      createSpineItemMock('c1.xhtml', 2)
    ]
    await result.open('content', { container: document.createElement('div') })

    expect(books[0].rendition.display).toHaveBeenCalledWith('c1.xhtml')
    expect(unref(result.loadError)).toBeUndefined()
  })

  it('reports a book without a renderable spine item instead of waiting forever', async () => {
    const { result } = mountComposable(() => useEpubBook())
    nextBook.spineItems = [createSpineItemMock('01.jpg', 0, [], { type: 'image/jpeg' })]
    await result.open('content', { container: document.createElement('div') })

    expect(books[0].rendition.display).not.toHaveBeenCalled()
    expect(unref(result.loadError)).toBeDefined()
    expect(unref(result.isLoading)).toBe(false)
  })

  it('reports a book whose sections all fail to display', async () => {
    const { result } = mountComposable(() => useEpubBook())
    nextBook.rejectFirstDisplay = true
    books.length = 0
    const open = result.open('content', { container: document.createElement('div') })
    await flushPromises()
    books[0].rendition.display.mockRejectedValue(new Error('broken'))
    await open

    expect(unref(result.loadError)).toBeDefined()
  })

  it('moves on when the restored page ends before the stored position', async () => {
    const { result } = mountComposable(() => useEpubBook())
    nextBook.currentLocation = createLocation({ cfi: 'cfi-10' }, {}, { cfi: 'cfi-20' })
    await result.open('content', {
      container: document.createElement('div'),
      initialCfi: 'cfi-30'
    })

    expect(books[0].rendition.next).toHaveBeenCalled()
  })

  it('stays when the restored page contains the stored position', async () => {
    const { result } = mountComposable(() => useEpubBook())
    nextBook.currentLocation = createLocation({ cfi: 'cfi-10' }, {}, { cfi: 'cfi-20' })
    await result.open('content', {
      container: document.createElement('div'),
      initialCfi: 'cfi-15'
    })

    expect(books[0].rendition.next).not.toHaveBeenCalled()
  })

  it('forwards page turns to the rendition', async () => {
    const { result } = mountComposable(() => useEpubBook())
    await result.open('content', { container: document.createElement('div') })

    result.prev()
    result.next()

    expect(books[0].rendition.prev).toHaveBeenCalled()
    expect(books[0].rendition.next).toHaveBeenCalled()
  })
})
