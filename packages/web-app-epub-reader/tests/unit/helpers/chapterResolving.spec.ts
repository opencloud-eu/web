import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mock } from 'vitest-mock-extended'
import type { NavItem, Location, Rendition } from 'epubjs'
import {
  findChapterByHref,
  findChapterByDomPosition,
  resolveCurrentChapter
} from '../../../src/helpers/chapterResolving'

describe('chapterResolving', () => {
  describe('findChapterByHref', () => {
    const chapters: NavItem[] = [
      { id: 'ch-1', label: 'Chapter 1', href: 'text/ch1.xhtml' },
      { id: 'ch-2', label: 'Chapter 2', href: 'text/ch2.xhtml#intro' },
      { id: 'ch-3', label: 'Chapter 3', href: 'text/ch3.xhtml' }
    ]

    it('returns chapter with exact href match', () => {
      const result = findChapterByHref(chapters, 'text/ch2.xhtml#intro')
      expect(result?.id).toBe('ch-2')
    })

    it('returns chapter with normalized href match when only one matches', () => {
      const result = findChapterByHref(chapters, 'text/ch1.xhtml#some-anchor')
      expect(result?.id).toBe('ch-1')
    })

    it('returns undefined when href is not provided', () => {
      const result = findChapterByHref(chapters, undefined)
      expect(result).toBeUndefined()
    })

    it('returns undefined when no match found', () => {
      const result = findChapterByHref(chapters, 'text/nonexistent.xhtml')
      expect(result).toBeUndefined()
    })

    it('returns undefined when multiple chapters match normalized href', () => {
      const chaptersWithDuplicates: NavItem[] = [
        { id: 'ch-1', label: 'Chapter 1', href: 'text/book.xhtml#ch1' },
        { id: 'ch-2', label: 'Chapter 2', href: 'text/book.xhtml#ch2' }
      ]
      const result = findChapterByHref(chaptersWithDuplicates, 'text/book.xhtml#ch3')
      expect(result).toBeUndefined()
    })
  })

  describe('findChapterByDomPosition', () => {
    // Only the members findChapterByDomPosition actually touches are mocked.
    function mockRenditionDom(members: object) {
      return members as unknown as Rendition
    }

    it('finds chapter by DOM element position', () => {
      const chapters: NavItem[] = [
        { id: 'ch-1', label: 'Chapter 1', href: 'text/book.xhtml#ch1' },
        { id: 'ch-2', label: 'Chapter 2', href: 'text/book.xhtml#ch2' },
        { id: 'ch-3', label: 'Chapter 3', href: 'text/book.xhtml#ch3' }
      ]

      const mockCh2Element = { compareDocumentPosition: vi.fn(() => 0) }
      const mockDocument = {
        getElementById: vi.fn((id: string) => {
          if (id === 'ch2') return mockCh2Element
          return null
        })
      }

      const rendition = mockRenditionDom({
        getContents: vi.fn(() => [{ document: mockDocument }]),
        getRange: vi.fn(() => ({ startContainer: mockCh2Element }))
      })

      const result = findChapterByDomPosition(chapters, 'epubcfi(/6/2)', rendition)
      expect(result?.id).toBe('ch-2')
    })

    it('returns undefined when document is not available', () => {
      const chapters: NavItem[] = [{ id: 'ch-1', label: 'Chapter 1', href: 'text/book.xhtml#ch1' }]

      const rendition = mockRenditionDom({
        getContents: vi.fn(() => null),
        getRange: vi.fn(() => null)
      })

      const result = findChapterByDomPosition(chapters, 'epubcfi(/6/2)', rendition)
      expect(result).toBeUndefined()
    })

    it('returns undefined when range is not available', () => {
      const chapters: NavItem[] = [{ id: 'ch-1', label: 'Chapter 1', href: 'text/book.xhtml#ch1' }]

      const mockDocument = { getElementById: vi.fn(() => null) }
      const rendition = mockRenditionDom({
        getContents: vi.fn(() => [{ document: mockDocument }]),
        getRange: vi.fn(() => null)
      })

      const result = findChapterByDomPosition(chapters, 'epubcfi(/6/2)', rendition)
      expect(result).toBeUndefined()
    })

    it('handles text nodes by using parent element', () => {
      const chapters: NavItem[] = [{ id: 'ch-1', label: 'Chapter 1', href: 'text/book.xhtml#ch1' }]

      const mockParentElement = document.createElement('div')
      const mockTextNode = document.createTextNode('text')
      Object.defineProperty(mockTextNode, 'parentElement', { value: mockParentElement })

      const mockChapterElement = {
        compareDocumentPosition: vi.fn(() => Node.DOCUMENT_POSITION_FOLLOWING)
      }
      const mockDocument = {
        getElementById: vi.fn(() => mockChapterElement)
      }

      const rendition = mockRenditionDom({
        getContents: vi.fn(() => [{ document: mockDocument }]),
        getRange: vi.fn(() => ({ startContainer: mockTextNode }))
      })

      const result = findChapterByDomPosition(chapters, 'epubcfi(/6/2)', rendition)
      expect(result?.id).toBe('ch-1')
    })

    it('returns undefined when an error occurs', () => {
      const chapters: NavItem[] = [{ id: 'ch-1', label: 'Chapter 1', href: 'text/book.xhtml#ch1' }]

      const rendition = mockRenditionDom({
        getContents: vi.fn(() => {
          throw new Error('Mock error')
        })
      })

      const result = findChapterByDomPosition(chapters, 'epubcfi(/6/2)', rendition)
      expect(result).toBeUndefined()
    })
  })

  describe('resolveCurrentChapter', () => {
    let mockBook: any
    let mockRendition: any

    beforeEach(() => {
      mockBook = {
        navigation: {
          get: vi.fn()
        },
        spine: {
          get: vi.fn()
        }
      }
      mockRendition = {
        getContents: vi.fn(),
        getRange: vi.fn()
      }
    })

    describe('Strategy 1: exact/normalized match via locationHref', () => {
      it('resolves chapter via exact locationHref match', () => {
        const chapters: NavItem[] = [
          { id: 'ch-1', label: 'Chapter 1', href: 'text/ch1.xhtml' },
          { id: 'ch-2', label: 'Chapter 2', href: 'text/ch2.xhtml' }
        ]

        const location = mock<Location>({
          start: { href: 'text/ch2.xhtml', cfi: 'epubcfi(/6/2)', displayed: { page: 1, total: 12 } }
        })

        const result = resolveCurrentChapter(location, mockBook, chapters, mockRendition)
        expect(result?.id).toBe('ch-2')
      })

      it('resolves chapter via normalized locationHref match (strips hash)', () => {
        const chapters: NavItem[] = [
          { id: 'ch-1', label: 'Chapter 1', href: 'text/book.xhtml' },
          { id: 'ch-2', label: 'Chapter 2', href: 'text/ch2.xhtml' }
        ]

        const location = mock<Location>({
          start: {
            href: 'text/book.xhtml#section-5',
            cfi: 'epubcfi(/6/2)',
            displayed: { page: 1, total: 12 }
          }
        })

        const result = resolveCurrentChapter(location, mockBook, chapters, mockRendition)
        expect(result?.id).toBe('ch-1')
      })
    })

    describe('Strategy 2: navigation.get(locationHref)', () => {
      it('resolves chapter via navigation.get with locationHref that maps to TOC', () => {
        const chapters: NavItem[] = [
          { id: 'ch-1', label: 'Chapter 1', href: 'text/ch1.xhtml' },
          { id: 'ch-2', label: 'Chapter 2', href: 'text/ch2.xhtml' }
        ]

        const location = mock<Location>({
          start: {
            href: 'text/page-5.xhtml',
            cfi: 'epubcfi(/6/2)',
            displayed: { page: 1, total: 12 }
          }
        })

        mockBook.navigation.get.mockImplementation((href: string) => {
          if (href === 'text/page-5.xhtml') {
            return { id: 'ch-2', label: 'Chapter 2', href: 'text/ch2.xhtml' }
          }
          return null
        })
        mockBook.spine.get.mockReturnValue({ href: 'text/page-5.xhtml' })

        const result = resolveCurrentChapter(location, mockBook, chapters, mockRendition)
        expect(result?.id).toBe('ch-2')
      })
    })

    describe('Strategy 3: navigation.get(spineHref)', () => {
      it('resolves chapter via navigation.get with spineHref', () => {
        const chapters: NavItem[] = [
          { id: 'ch-1', label: 'Chapter 1', href: 'text/ch1.xhtml' },
          { id: 'ch-3', label: 'Chapter 3', href: 'text/ch3.xhtml' }
        ]

        const location = mock<Location>({
          start: {
            href: 'text/unknown.xhtml',
            cfi: 'epubcfi(/6/4)',
            displayed: { page: 1, total: 12 }
          }
        })

        mockBook.spine.get.mockImplementation((target: string) => {
          if (target === 'epubcfi(/6/4)' || target === 'text/unknown.xhtml') {
            return { href: 'text/spine-item.xhtml', index: 2 }
          }
          return null
        })
        mockBook.navigation.get.mockImplementation((href: string) => {
          if (href === 'text/spine-item.xhtml') {
            return { id: 'ch-3', label: 'Chapter 3', href: 'text/ch3.xhtml' }
          }
          return null
        })

        const result = resolveCurrentChapter(location, mockBook, chapters, mockRendition)
        expect(result?.id).toBe('ch-3')
      })
    })

    describe('Strategy 4: normalized spine href match', () => {
      it('resolves single chapter matching normalized spine href', () => {
        const chapters: NavItem[] = [
          { id: 'ch-1', label: 'Chapter 1', href: 'text/ch1.xhtml#intro' },
          { id: 'ch-2', label: 'Chapter 2', href: 'text/ch2.xhtml' }
        ]

        const location = mock<Location>({
          start: {
            href: 'text/unrelated.xhtml',
            cfi: 'epubcfi(/6/2)',
            displayed: { page: 1, total: 12 }
          }
        })

        mockBook.spine.get.mockReturnValue({ href: 'text/ch2.xhtml', index: 1 })
        mockBook.navigation.get.mockReturnValue(null)

        const result = resolveCurrentChapter(location, mockBook, chapters, mockRendition)
        expect(result?.id).toBe('ch-2')
      })
    })

    describe('Strategy 4b: multiple chapters in same file with DOM position', () => {
      it('resolves via DOM position when multiple chapters exist in same file', () => {
        const chapters: NavItem[] = [
          { id: 'ch-1', label: 'Chapter 1', href: 'text/book.xhtml#ch1' },
          { id: 'ch-2', label: 'Chapter 2', href: 'text/book.xhtml#ch2' },
          { id: 'ch-3', label: 'Chapter 3', href: 'text/book.xhtml#ch3' }
        ]

        const location = mock<Location>({
          start: {
            href: 'text/book.xhtml',
            cfi: 'epubcfi(/6/2)',
            displayed: { page: 1, total: 12 }
          }
        })

        const mockCh2Element = { compareDocumentPosition: vi.fn(() => 0) }
        const mockDocument = {
          getElementById: vi.fn((id: string) => {
            if (id === 'ch2') return mockCh2Element
            return null
          })
        }

        mockBook.spine.get.mockReturnValue({ href: 'text/book.xhtml', index: 0 })
        mockBook.navigation.get.mockReturnValue(null)
        mockRendition.getContents = vi.fn(() => [{ document: mockDocument }])
        mockRendition.getRange = vi.fn(() => ({ startContainer: mockCh2Element }))

        const result = resolveCurrentChapter(location, mockBook, chapters, mockRendition)
        expect(result?.id).toBe('ch-2')
      })

      it('falls back to the first chapter in the file when DOM position matching fails', () => {
        const chapters: NavItem[] = [
          { id: 'ch-1', label: 'Chapter 1', href: 'text/book.xhtml#ch1' },
          { id: 'ch-2', label: 'Chapter 2', href: 'text/book.xhtml#ch2' },
          { id: 'ch-3', label: 'Chapter 3', href: 'text/book.xhtml#ch3' }
        ]

        const location = mock<Location>({
          start: {
            href: 'text/book.xhtml',
            cfi: 'epubcfi(/6/2)',
            displayed: { page: 1, total: 12 }
          }
        })

        mockBook.spine.get.mockImplementation((target: string) => {
          if (target === 'epubcfi(/6/2)' || target === 'text/book.xhtml') {
            return { href: 'text/book.xhtml', index: 5 }
          }
          return null
        })
        mockBook.navigation.get.mockReturnValue(null)
        mockRendition.getContents = vi.fn(() => null)
        mockRendition.getRange = vi.fn(() => null)

        const result = resolveCurrentChapter(location, mockBook, chapters, mockRendition)
        expect(result?.id).toBe('ch-1')
      })
    })

    describe('Strategy 5: spine index for chapters spanning multiple files', () => {
      it('resolves chapter by finding highest spine index <= current position', () => {
        const chapters: NavItem[] = [
          { id: 'ch-1', label: 'Chapter 1', href: 'text/ch1-part1.xhtml' },
          { id: 'ch-2', label: 'Chapter 2', href: 'text/ch2-part1.xhtml' },
          { id: 'ch-3', label: 'Chapter 3', href: 'text/ch3-part1.xhtml' }
        ]

        const location = mock<Location>({
          start: {
            href: 'text/ch2-part5.xhtml',
            cfi: 'epubcfi(/6/10)',
            displayed: { page: 1, total: 12 }
          }
        })

        mockBook.spine.get.mockImplementation((target: string) => {
          if (target === 'epubcfi(/6/10)' || target === 'text/ch2-part5.xhtml') {
            return { href: 'text/ch2-part5.xhtml', index: 9 }
          }
          if (target === 'text/ch1-part1.xhtml') return { index: 2 }
          if (target === 'text/ch2-part1.xhtml') return { index: 5 }
          if (target === 'text/ch3-part1.xhtml') return { index: 15 }
          return null
        })
        mockBook.navigation.get.mockReturnValue(null)

        const result = resolveCurrentChapter(location, mockBook, chapters, mockRendition)
        expect(result?.id).toBe('ch-2')
      })
    })

    describe('edge cases and fallbacks', () => {
      it('returns undefined when no navigation is available', () => {
        const chapters: NavItem[] = [
          { id: 'ch-1', label: 'Chapter 1', href: 'text/ch1.xhtml' },
          { id: 'ch-2', label: 'Chapter 2', href: 'text/ch2.xhtml' }
        ]
        const bookWithoutNav = { ...mockBook, navigation: null }

        const location = mock<Location>({
          start: { href: 'text/ch2.xhtml', cfi: 'epubcfi(/6/2)', displayed: { page: 1, total: 12 } }
        })

        const result = resolveCurrentChapter(location, bookWithoutNav, chapters, mockRendition)
        expect(result).toBeUndefined()
      })

      it('returns undefined when spine href cannot be determined', () => {
        const chapters: NavItem[] = [
          { id: 'ch-1', label: 'Chapter 1', href: 'text/ch1.xhtml' },
          { id: 'ch-2', label: 'Chapter 2', href: 'text/ch2.xhtml' }
        ]

        const location = mock<Location>({
          start: {
            cfi: undefined,
            href: undefined,
            index: undefined,
            displayed: { page: 1, total: 12 }
          }
        })

        mockBook.spine.get.mockReturnValue(null)

        const result = resolveCurrentChapter(location, mockBook, chapters, mockRendition)
        expect(result).toBeUndefined()
      })

      it('returns undefined when all strategies fail', () => {
        const chapters: NavItem[] = [
          { id: 'ch-1', label: 'Chapter 1', href: 'text/ch1.xhtml' },
          { id: 'ch-2', label: 'Chapter 2', href: 'text/ch2.xhtml' }
        ]

        const location = mock<Location>({
          start: {
            href: 'text/nonexistent.xhtml',
            cfi: 'epubcfi(/6/99)',
            displayed: { page: 1, total: 12 }
          }
        })

        // Only the current location maps to a spine item, none of the chapters do.
        mockBook.spine.get.mockImplementation((target: string) =>
          target === 'epubcfi(/6/99)' ? { href: 'text/orphan.xhtml', index: 999 } : null
        )
        mockBook.navigation.get.mockReturnValue(null)

        const result = resolveCurrentChapter(location, mockBook, chapters, mockRendition)
        expect(result).toBeUndefined()
      })

      it('returns undefined when chapter list is empty', () => {
        const chapters: NavItem[] = []

        const location = mock<Location>({
          start: { href: 'text/ch1.xhtml', cfi: 'epubcfi(/6/2)', displayed: { page: 1, total: 12 } }
        })

        const result = resolveCurrentChapter(location, mockBook, chapters, mockRendition)
        expect(result).toBeUndefined()
      })
    })
  })
})
