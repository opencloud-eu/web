import type { NavItem } from 'epubjs'
import { Chapter } from '../types'

/**
 * Flattens the nested table of contents of epub.js into a list in reading order, keeping the
 * nesting depth for indentation. The ids epub.js assigns aren't unique (it falls back to the
 * href, which nested entries share), so the list position is used instead.
 */
export function flattenToc(items: NavItem[]): Chapter[] {
  const chapters: Chapter[] = []

  function visit(navItems: NavItem[], depth: number) {
    for (const item of navItems) {
      chapters.push({
        id: `toc-${chapters.length}`,
        href: item.href,
        label: item.label.trim(),
        depth
      })
      if (item.subitems?.length) {
        visit(item.subitems, depth + 1)
      }
    }
  }

  visit(items, 0)
  return chapters
}
