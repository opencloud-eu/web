import { Location, NavItem } from 'epubjs'
import { flushPromises } from '@vue/test-utils'
import { nextTick, Ref, shallowRef, unref } from 'vue'
import { useChapters } from '../../../src/composables/useChapters'
import {
  BookMock,
  createBookMock,
  createLocation,
  createRenditionMock,
  createSpineItemMock,
  mountComposable
} from '../mocks'

const toc = [
  { id: 'cover', href: 'cover.xhtml', label: 'Cover', subitems: [] },
  {
    id: 'part-1',
    href: 'part1.xhtml',
    label: 'Part 1',
    subitems: [
      { id: 'ch-1', href: 'part1.xhtml#ch1', label: 'Chapter 1', subitems: [] },
      { id: 'ch-2', href: 'part1.xhtml#ch2', label: 'Chapter 2', subitems: [] }
    ]
  },
  { id: 'ch-3', href: 'ch3.xhtml', label: 'Chapter 3', subitems: [] }
] as NavItem[]

const spineItems = [
  createSpineItemMock('cover.xhtml', 0),
  createSpineItemMock('part1.xhtml', 1),
  createSpineItemMock('ch3.xhtml', 2),
  createSpineItemMock('appendix.xhtml', 3)
]

async function setup(bookMock: BookMock = createBookMock({ toc, spineItems })) {
  const book = shallowRef(bookMock as any)
  const rendition = shallowRef(bookMock.rendition as any)
  const location = shallowRef<Location | undefined>()
  const { result } = mountComposable(() => useChapters({ book, rendition, location }))
  await flushPromises()
  return { result, book, rendition, location, bookMock }
}

async function relocate(location: Ref<Location | undefined>, index: number, cfi = 'cfi') {
  location.value = createLocation({ index, cfi })
  await nextTick()
}

describe('useChapters', () => {
  it('lists the flattened table of contents', async () => {
    const { result } = await setup()

    expect(unref(result.chapters).map((chapter) => [chapter.label, chapter.depth])).toEqual([
      ['Cover', 0],
      ['Part 1', 0],
      ['Chapter 1', 1],
      ['Chapter 2', 1],
      ['Chapter 3', 0]
    ])
  })

  it('resolves the only chapter of the displayed spine item', async () => {
    const { result, location } = await setup()

    await relocate(location, 2)

    expect(unref(result.currentChapter)?.label).toBe('Chapter 3')
  })

  describe('several chapters in one spine item', () => {
    const doc = new DOMParser().parseFromString(
      '<html><body><h1 id="part">Part 1</h1><p id="p1">intro</p><h2 id="ch1">1</h2><p id="p2">one</p><h2 id="ch2">2</h2><p id="p3">two</p></body></html>',
      'text/html'
    )

    async function setupPage(bookMock = createBookMock({ toc, spineItems })) {
      const context = await setup(bookMock)
      bookMock.rendition.getContents.mockReturnValue([{ document: doc }])
      bookMock.rendition.getRange.mockImplementation((cfi: string) => ({
        startContainer: doc.getElementById(cfi)
      }))
      return context
    }

    async function showPage(location: Ref<Location | undefined>, startId: string, endId: string) {
      location.value = createLocation({ index: 1, cfi: startId }, {}, { cfi: endId })
      await nextTick()
    }

    it('resolves the last chapter that has started by the end of the page', async () => {
      const { result, location } = await setupPage()

      await showPage(location, 'p2', 'p2')
      expect(unref(result.currentChapter)?.label).toBe('Chapter 1')

      await showPage(location, 'p3', 'p3')
      expect(unref(result.currentChapter)?.label).toBe('Chapter 2')

      await showPage(location, 'p1', 'p1')
      expect(unref(result.currentChapter)?.label).toBe('Part 1')

      // the heading of chapter 2 is at the bottom of the page
      await showPage(location, 'p2', 'ch2')
      expect(unref(result.currentChapter)?.label).toBe('Chapter 2')
    })

    it('treats a chapter without a fragment as started on an image-only page', async () => {
      const bookMock = createBookMock({
        toc: [
          { id: 'cover', href: 'cover.xhtml', label: 'Cover', subitems: [] },
          { id: 'title', href: 'title.xhtml', label: 'Title page', subitems: [] }
        ] as NavItem[],
        spineItems: [createSpineItemMock('cover.xhtml', 0), createSpineItemMock('title.xhtml', 1)]
      })
      const { result, location, bookMock: mock } = await setupPage(bookMock)
      const imageDoc = new DOMParser().parseFromString(
        '<html><body> <div><img src="t.png"></div></body></html>',
        'text/html'
      )
      mock.rendition.getContents.mockReturnValue([{ document: imageDoc }])
      mock.rendition.getRange.mockImplementation(() => ({
        startContainer: imageDoc.body.firstChild
      }))

      await relocate(location, 1)

      expect(unref(result.currentChapter)?.label).toBe('Title page')
    })

    it('ignores a page end that epub.js reports before the page start', async () => {
      const { result, location } = await setupPage()

      // vertical writing: the end resolves to a node at the top of the document
      await showPage(location, 'ch2', 'part')
      expect(unref(result.currentChapter)?.label).toBe('Chapter 2')
    })

    it('keeps a chapter the user navigated to while its heading is on the page', async () => {
      const { result, location } = await setupPage()
      const chapterOne = unref(result.chapters).find((chapter) => chapter.label === 'Chapter 1')

      result.goToChapter(chapterOne)
      await showPage(location, 'part', 'p3')
      expect(unref(result.currentChapter)?.label).toBe('Chapter 1')

      await showPage(location, 'p3', 'p3')
      expect(unref(result.currentChapter)?.label).toBe('Chapter 2')
    })

    it('resolves the preceding chapter when the only chapter of the spine item starts further down', async () => {
      const bookMock = createBookMock({
        toc: [
          { id: 'a', href: 'one.xhtml', label: 'A', subitems: [] },
          { id: 'b', href: 'two.xhtml#ch2', label: 'B', subitems: [] }
        ] as NavItem[],
        spineItems: [createSpineItemMock('one.xhtml', 0), createSpineItemMock('two.xhtml', 1)]
      })
      const { result, location } = await setupPage(bookMock)

      // two.xhtml starts with the end of A, the heading of B is on a later page
      location.value = createLocation({ index: 1, cfi: 'part' }, {}, { cfi: 'p1' })
      await nextTick()
      expect(unref(result.currentChapter)?.label).toBe('A')

      location.value = createLocation({ index: 1, cfi: 'p3' }, {}, { cfi: 'p3' })
      await nextTick()
      expect(unref(result.currentChapter)?.label).toBe('B')
    })

    it('forgets the requested chapter once another spine item was displayed', async () => {
      const { result, location } = await setupPage()
      const partOne = unref(result.chapters).find((chapter) => chapter.label === 'Part 1')

      result.goToChapter(partOne)
      await showPage(location, 'part', 'p3')
      expect(unref(result.currentChapter)?.label).toBe('Part 1')

      await relocate(location, 2)
      expect(unref(result.currentChapter)?.label).toBe('Chapter 3')

      await showPage(location, 'part', 'p3')
      expect(unref(result.currentChapter)?.label).toBe('Chapter 2')
    })

    it('falls back to the first chapter of the spine item when the position is unknown', async () => {
      const { result, location, bookMock } = await setupPage()
      bookMock.rendition.getContents.mockReturnValue([])

      await relocate(location, 1)

      expect(unref(result.currentChapter)?.label).toBe('Part 1')
    })
  })

  it('resolves the last chapter of the nearest preceding spine item for spine items without a chapter', async () => {
    const { result, location } = await setup()

    await relocate(location, 3)
    expect(unref(result.currentChapter)?.label).toBe('Chapter 3')

    const bookMock = createBookMock({
      toc: [
        { id: 'b', href: 'x.xhtml#b', label: 'B', subitems: [] },
        { id: 'c', href: 'x.xhtml#c', label: 'C', subitems: [] }
      ] as NavItem[],
      spineItems: [createSpineItemMock('x.xhtml', 0), createSpineItemMock('y.xhtml', 1)]
    })
    const second = await setup(bookMock)
    await relocate(second.location, 1)
    expect(unref(second.result.currentChapter)?.label).toBe('C')
  })

  it('selects the first chapter for spine items before the first chapter', async () => {
    const { result, location } = await setup(
      createBookMock({ toc, spineItems: [createSpineItemMock('intro.xhtml', 0), ...spineItems] })
    )

    await relocate(location, 0)

    expect(unref(result.currentChapter)?.label).toBe('Cover')
  })

  it('keeps the current chapter when a later location cannot be resolved', async () => {
    const { result, location, bookMock } = await setup()
    await relocate(location, 2)
    expect(unref(result.currentChapter)?.label).toBe('Chapter 3')

    bookMock.rendition.getContents.mockReturnValue([])
    location.value = createLocation({ index: undefined, cfi: 'cfi' })
    await nextTick()

    expect(unref(result.currentChapter)?.label).toBe('Chapter 3')
  })

  it('displays and selects the chapter on navigation', async () => {
    const { result, bookMock } = await setup()
    const chapter = unref(result.chapters)[4]

    result.goToChapter(chapter)

    expect(unref(result.currentChapter)).toBe(chapter)
    expect(bookMock.rendition.display).toHaveBeenCalledWith('ch3.xhtml')
  })

  it('resolves TOC hrefs that are relative to the navigation document', async () => {
    const bookMock = createBookMock({
      toc: [
        { id: 'a', href: '../Content/a.xhtml', label: 'A', subitems: [] },
        { id: 'b', href: '../Content/b.xhtml#part-2', label: 'B', subitems: [] },
        { id: 'c', href: 'missing.xhtml', label: 'C', subitems: [] }
      ] as NavItem[],
      spineItems: [
        createSpineItemMock('Content/a.xhtml', 0),
        createSpineItemMock('Content/b.xhtml', 1)
      ],
      navPath: 'Navigation/nav.xhtml'
    })
    const { result, location } = await setup(bookMock)

    expect(unref(result.chapters).map((chapter) => chapter.href)).toEqual([
      'Content/a.xhtml',
      'Content/b.xhtml#part-2',
      'missing.xhtml'
    ])

    await relocate(location, 1)
    expect(unref(result.currentChapter)?.label).toBe('B')

    result.goToChapter(unref(result.chapters)[1])
    expect(bookMock.rendition.display).toHaveBeenCalledWith('Content/b.xhtml#part-2')
  })

  it('swallows display errors for hrefs epub.js cannot find', async () => {
    const { result, bookMock } = await setup()
    bookMock.rendition.display.mockRejectedValueOnce(new Error('No Section Found'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    await result.goToChapter(unref(result.chapters)[0])

    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('resets when the book is closed', async () => {
    const { result, book, location } = await setup()
    await relocate(location, 2)

    book.value = undefined
    await flushPromises()

    expect(unref(result.chapters)).toEqual([])
    expect(unref(result.currentChapter)).toBeUndefined()
  })

  it('ignores the navigation of a book that was replaced while it loaded', async () => {
    const book = shallowRef<any>()
    const rendition = shallowRef(createRenditionMock() as any)
    const location = shallowRef<Location | undefined>()
    const { result } = mountComposable(() => useChapters({ book, rendition, location }))

    const slowBook = createBookMock({ toc })
    slowBook.loaded.navigation = new Promise((resolve) => setTimeout(() => resolve({ toc }), 10))
    book.value = slowBook as any
    await nextTick()
    book.value = createBookMock({ toc: [toc[2]] }) as any
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(unref(result.chapters).map((chapter) => chapter.label)).toEqual(['Chapter 3'])
  })
})
