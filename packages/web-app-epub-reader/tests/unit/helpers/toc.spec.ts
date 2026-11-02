import { NavItem } from 'epubjs'
import { flattenToc } from '../../../src/helpers/toc'

describe('flattenToc', () => {
  it('flattens nested items in reading order with their depth', () => {
    const toc = [
      {
        id: 'part-1',
        href: 'part1.xhtml',
        label: 'Part 1',
        subitems: [
          { id: 'ch-1', href: 'ch1.xhtml', label: ' Chapter 1 ', subitems: [] },
          {
            id: 'ch-2',
            href: 'ch2.xhtml',
            label: 'Chapter 2',
            subitems: [{ id: 'ch-2-1', href: 'ch2.xhtml#s1', label: 'Section 2.1', subitems: [] }]
          }
        ]
      },
      { id: 'part-2', href: 'part2.xhtml', label: 'Part 2', subitems: [] }
    ] as NavItem[]

    expect(flattenToc(toc)).toEqual([
      { id: 'toc-0', href: 'part1.xhtml', label: 'Part 1', depth: 0 },
      { id: 'toc-1', href: 'ch1.xhtml', label: 'Chapter 1', depth: 1 },
      { id: 'toc-2', href: 'ch2.xhtml', label: 'Chapter 2', depth: 1 },
      { id: 'toc-3', href: 'ch2.xhtml#s1', label: 'Section 2.1', depth: 2 },
      { id: 'toc-4', href: 'part2.xhtml', label: 'Part 2', depth: 0 }
    ])
  })

  it('gives entries unique ids, also when epub.js repeats the href as id', () => {
    const toc = [
      {
        id: 'ch1.xhtml',
        href: 'ch1.xhtml',
        label: 'A',
        subitems: [{ id: 'ch1.xhtml', href: 'ch1.xhtml', label: 'A.1' }]
      },
      { id: undefined, href: 'b.xhtml', label: 'B' }
    ] as NavItem[]

    expect(flattenToc(toc).map((chapter) => chapter.id)).toEqual(['toc-0', 'toc-1', 'toc-2'])
  })
})
