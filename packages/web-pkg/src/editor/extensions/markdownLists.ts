import type { JSONContent, MarkdownToken } from '@tiptap/core'
import { ListItem, OrderedList } from '@tiptap/extension-list'
import { Tokenizer } from 'marked'
import type { Marked } from 'marked'
import { expandLeadingTabs, fenceOpenPattern, isFenceClose } from './markdownIndentation'

function isEmptySubItemUnderline(token?: MarkdownToken): boolean {
  // `- text` followed by `  -` lexes as a setext heading, not as an empty sub item
  return (
    token?.type === 'heading' &&
    !token.raw?.trimStart().startsWith('#') &&
    /\n[ \t]*-[ \t]*\n*$/.test(token.raw ?? '')
  )
}

function lineIndent(line: string): number {
  return line.length - line.trimStart().length
}

/**
 * Sub items following the underline are lexed into their own list. Items indented
 * past the underline belong to the empty item, the others are its siblings.
 */
function withEmptySubItem(
  underline: MarkdownToken,
  rest: JSONContent[],
  listToken?: MarkdownToken
): JSONContent[] {
  const emptyItem: JSONContent = { type: 'listItem', content: [{ type: 'paragraph', content: [] }] }
  const [next, ...others] = rest
  const items = next?.content ?? []
  const itemTokens = listToken?.items ?? []

  if (next?.type !== 'bulletList' || itemTokens.length !== items.length) {
    return [{ type: 'bulletList', content: [emptyItem] }, ...rest]
  }

  const childIndent = lineIndent(underline.raw.trimEnd().split('\n').pop()) + 2
  const siblingIndex = itemTokens.findIndex(({ raw }) => lineIndent(raw) < childIndent)
  const childCount = siblingIndex === -1 ? items.length : siblingIndex
  if (childCount) {
    emptyItem.content.push({ ...next, content: items.slice(0, childCount) })
  }

  return [{ ...next, content: [emptyItem, ...items.slice(childCount)] }, ...others]
}

/**
 * The schema wants `paragraph block*` in a list item. Markdown allows any block
 * first, and content that breaks the schema gets dropped by the yjs binding.
 *
 * FIXME: see https://github.com/ueberdosis/tiptap/issues/8446. `MarkdownListItem`
 * can go once tiptap only returns valid list items.
 */
export function normalizeMarkdownListItem(item: JSONContent, token?: MarkdownToken): JSONContent {
  const content = item.content ?? []
  const [first, ...rest] = content

  if (!first) {
    return { ...item, content: [{ type: 'paragraph', content: [] }, ...rest] }
  }

  if (first.type === 'paragraph') {
    return { ...item, content }
  }

  // ATX headings stay headings, setext ones are mostly text followed by an underline
  const [headingToken, listToken] = token?.tokens?.filter(({ type }) => type !== 'space') ?? []
  const isSetext =
    headingToken?.type === 'heading' && !headingToken.raw?.trimStart().startsWith('#')
  if (first.type === 'heading' && isSetext) {
    const paragraph: JSONContent = { type: 'paragraph', content: first.content ?? [] }

    if (isEmptySubItemUnderline(headingToken)) {
      return { ...item, content: [paragraph, ...withEmptySubItem(headingToken, rest, listToken)] }
    }

    return { ...item, content: [paragraph, ...rest] }
  }

  return { ...item, content: [{ type: 'paragraph', content: [] }, first, ...rest] }
}

function checkboxAsText(checkbox: MarkdownToken): MarkdownToken {
  return { type: 'text', raw: checkbox.raw, text: checkbox.raw }
}

/**
 * Task syntax outside a task list, e.g. `1. [ ] task`. Tiptap drops marked's
 * checkbox token, which loses the item text. It is kept as text instead.
 */
function keepCheckboxAsText(token: MarkdownToken): MarkdownToken {
  const [first, ...rest] = token.tokens ?? []

  // followed by its text or, if the item holds more blocks, its paragraph
  if (first?.type === 'checkbox' && rest[0]?.tokens) {
    const [next, ...blocks] = rest
    const tokens = [checkboxAsText(first), ...next.tokens]
    return { ...token, tokens: [{ ...next, tokens }, ...blocks] }
  }

  if (first?.type === 'paragraph' && first.tokens?.[0]?.type === 'checkbox') {
    const [checkbox, ...inline] = first.tokens
    return {
      ...token,
      tokens: [{ ...first, tokens: [checkboxAsText(checkbox), ...inline] }, ...rest]
    }
  }

  return token
}

interface NestingItem {
  indent: number
  content: number
  ordered: boolean
  shift?: number
}

const orderedMarkerPattern = /^\d{1,9}[.)](?=\s|$)/
const orderedListStartPattern = /^ {0,3}\d{1,9}[.)](?=\s|$)/
const bulletMarkerPattern = /^[-+*](?=\s|$)/
// lines that end a paragraph instead of continuing it lazily
const blockStartPattern = /^(?:[-+*>#<]|\d{1,9}[.)]|`{3,}|~{3,})/
// lines no line continues lazily: headings (any `#`, like marked), fences and thematic breaks
const noParagraphPattern = /^(?:#|`{3,}|~{3,}|([-*_])(?:[ \t]*\1){2,}[ \t]*$)/
const leadingMarkerPattern = /^(?:\d{1,9}[.)]|[-+*])(?:[ \t]+|$)/
const setextUnderlinePattern = /^(?:=+|-+)[ \t]*$/

function nestingItem(text: string, indent: number): NestingItem | undefined {
  const marker = orderedMarkerPattern.exec(text)?.[0]
  if (marker) {
    const spaces = /^ */.exec(text.slice(marker.length))[0].length
    const width = marker.length + (spaces >= 1 && spaces <= 4 ? spaces : 1)
    return { indent, content: indent + width, ordered: true }
  }
  if (bulletMarkerPattern.test(text)) {
    return { indent, content: indent + 2, ordered: false }
  }
}

// once shifted, lines short of the content column leave the item, as in marked
function isNested(item: NestingItem | undefined, indent: number): boolean {
  if (!item) {
    return false
  }
  return indent >= (item.shift === undefined ? item.indent + 2 : item.content - item.shift)
}

/**
 * Tiptap before 3.31 (OpenCloud v7.x) indented content below an ordered item by
 * two spaces, short of the item's content column, e.g. three for `1. `. Markdown
 * moves such content out of the item. If an ordered item's first nested line is
 * indented less than its content column, all its nested lines are moved by that
 * difference. Unlike markdown, lines indented two spaces past an ordered marker
 * then belong to the item, e.g. `  1. sub` below `1. item` is a sub item.
 *
 * FIXME: see https://github.com/ueberdosis/tiptap/issues/8445. Only needed while
 * `MarkdownOrderedList` leaves numeric lists to marked, tiptap's own tokenizer
 * reads such content as nested.
 */
function normalizeOrderedListIndentation(src: string): string {
  const items: NestingItem[] = []
  const delimiter = orderedListStartPattern.exec(src)?.[0].at(-1)
  let normalized = ''
  let fence: string | undefined
  let shifted = false
  let lazyAllowed = false

  // line by line, the list usually ends long before `src`
  for (let start = 0, end = 0; start < src.length; start = end) {
    const newline = src.indexOf('\n', start)
    end = newline === -1 ? src.length : newline + 1
    const line = src.slice(start, end)
    const text = line.trimStart()
    const indent = expandLeadingTabs(line).length - text.length
    const wasLazyAllowed = lazyAllowed
    const content = text.trimEnd().replace(leadingMarkerPattern, '')
    lazyAllowed = !!content && !noParagraphPattern.test(content)

    // fenced lines are never lazy, an unnested one leaves the fence in its item
    if (text && fence && !isNested(items.at(-1), indent)) {
      return src
    }

    const isFenced = !!fence
    const isLazy =
      !isFenced &&
      items.length > 0 &&
      !isNested(items.at(-1), indent) &&
      wasLazyAllowed &&
      !blockStartPattern.test(text) &&
      !noParagraphPattern.test(text.trimEnd())
    if (!text || isLazy) {
      normalized += line
      continue
    }

    let item: NestingItem | undefined
    if (isFenced) {
      fence = isFenceClose(text, fence) ? undefined : fence
    } else {
      while (items.length && !isNested(items.at(-1), indent)) {
        items.pop()
      }

      const owner = items.at(-1)
      // marked ends the list here, also at another delimiter
      if (!owner && orderedMarkerPattern.exec(text)?.[0].at(-1) !== delimiter) {
        return shifted ? normalized + src.slice(start) : src
      }

      // shifted, it would turn the item text into a setext heading
      const isUnderline = wasLazyAllowed && setextUnderlinePattern.test(text.trimEnd())
      if (owner && isUnderline && indent < owner.content) {
        return shifted ? normalized + src.slice(start) : src
      }

      const candidate = nestingItem(text, indent)
      if (owner) {
        owner.shift ??= owner.ordered ? Math.max(owner.content - indent, 0) : 0
      }
      // deeper lines are indented code
      if (candidate && (!owner || indent + owner.shift < owner.content + 4)) {
        item = candidate
      }
      fence = item ? undefined : fenceOpenPattern.exec(text)?.[1]
    }

    const shift = items.reduce((sum, { shift }) => sum + (shift ?? 0), 0)
    normalized += shift ? ' '.repeat(shift) + expandLeadingTabs(line) : line
    shifted ||= shift > 0
    if (item) {
      items.push(item)
    }
  }

  return shifted ? normalized : src
}

/**
 * Length of the `src` lines `raw` was lexed from, when both have the same lines.
 */
function sourceLength(src: string, raw: string): number {
  let length = 0
  for (let newlines = raw.split('\n').length - 1; newlines > 0; newlines--) {
    length = src.indexOf('\n', length) + 1
  }
  const lineEnd = src.indexOf('\n', length)
  return lineEnd === -1 ? src.length : lineEnd
}

const emptyFirstItemPattern = /^( {0,3}(?:[-+*]|\d{1,9}[.)]))[ \t]+(?=\n|$)/

/**
 * Marked starts no list at a marker followed by whitespace only, e.g. the `- ` of
 * an empty first item. That line becomes paragraph text and gets escaped on save.
 * Marked's list tokenizer gets the list without that whitespace instead.
 *
 * With `alignOrderedItemContent`, content indented two spaces below an ordered
 * item stays in the item, see `normalizeOrderedListIndentation`.
 *
 * Takes the instance as an argument for the same reason as `registerFrontmatterTokenizer`.
 */
export function registerMarkdownListTokenizer(
  instance: Marked,
  { alignOrderedItemContent = true }: { alignOrderedItemContent?: boolean } = {}
): void {
  instance.use({
    tokenizer: {
      list(src) {
        const normalized =
          alignOrderedItemContent && orderedListStartPattern.test(src)
            ? normalizeOrderedListIndentation(src)
            : src
        const match = emptyFirstItemPattern.exec(normalized)
        if (!match && normalized === src) {
          return false
        }

        const listSrc = match ? match[1] + normalized.slice(match[0].length) : normalized
        const token = Tokenizer.prototype.list.call(this, listSrc)
        if (!token) {
          return false
        }

        // `raw` tells marked how much of `src` was consumed
        return { ...token, raw: src.slice(0, sourceLength(src, token.raw)) }
      }
    }
  })
}

/**
 * Markdown reads an image line below text as part of that paragraph. Tiptap puts a
 * blank line before paragraphs only, so images are written as paragraphs, which
 * parse back into images. An image after an empty paragraph goes on the marker line.
 */
function withImageParagraphs(content: JSONContent[]): JSONContent[] {
  const wrapped = content.map((child) =>
    child.type === 'image' ? { type: 'paragraph', content: [child] } : child
  )
  const [first, ...rest] = content
  const isEmptyParagraph = first?.type === 'paragraph' && !first.content?.length
  return isEmptyParagraph && rest[0]?.type === 'image' ? wrapped.slice(1) : wrapped
}

export const MarkdownListItem = ListItem.extend({
  parseMarkdown(token, helpers) {
    const itemToken = token.task ? keepCheckboxAsText(token) : token
    // Tight items hold their text in block level text tokens, which tiptap turns
    // into bare text without inline formatting. As paragraphs they parse fully.
    const tokens = itemToken.tokens?.map((child) =>
      child.type === 'text' && child.tokens ? { ...child, type: 'paragraph' } : child
    )
    const result = this.parent?.({ ...itemToken, tokens }, helpers)

    if (!result || Array.isArray(result) || !('type' in result) || result.type !== 'listItem') {
      return result
    }

    return normalizeMarkdownListItem(result, token)
  },

  renderMarkdown(node, h, ctx) {
    const content = withImageParagraphs(node.content ?? [])
    const rendered: string = this.parent?.({ ...node, content }, h, ctx) ?? ''
    if (content[0]?.content?.length) {
      return rendered
    }

    // A bare marker is fine for an item without content, except for the first
    // item of a sub list: below the parent's text, `-` is a setext underline and
    // `1.` lazy continuation text. Letter and roman markers need text to parse.
    // FIXME: see https://github.com/ueberdosis/tiptap/issues/8446
    const listType = ctx.meta?.parentAttrs?.type
    const isBare =
      content.length === 1 && !(ctx.index === 0 && ctx.level > 1) && (!listType || listType === '1')
    const [marker, ...lines] = rendered.split('\n')
    return [marker.trimEnd() + (isBare ? '' : ' &nbsp;'), ...lines].join('\n')
  }
})

const orderedListTokenizer = OrderedList.config.markdownTokenizer

/**
 * Numeric ordered lists are left to marked, which follows CommonMark. Tiptap's
 * own tokenizer compares marker indentation exactly and drops items indented
 * less than the first one, so ` 9.` followed by `10.` loses `10.`. Their items
 * are parsed by `ListItem` like bullet items. Letter and roman markers are no
 * CommonMark, those lists stay with tiptap.
 *
 * FIXME: see https://github.com/ueberdosis/tiptap/issues/8445. `MarkdownOrderedList`
 * can go once tiptap keeps those items.
 */
export const MarkdownOrderedList = OrderedList.extend({
  parseMarkdown(token, helpers) {
    if (token.typeMarker) {
      // tiptap builds these items itself, without `MarkdownListItem`
      const result = this.parent?.(token, helpers)
      if (!result || Array.isArray(result) || !result.content) {
        return result
      }
      return {
        ...result,
        content: result.content.map((item, index) =>
          item.type === 'listItem' ? normalizeMarkdownListItem(item, token.items?.[index]) : item
        )
      }
    }
    if (token.type !== 'list' || !token.ordered) {
      return []
    }
    // tiptap writes a list starting at 0 as starting at 1
    const start = Number(token.start) || 1
    return {
      type: 'orderedList',
      ...(start !== 1 && { attrs: { start } }),
      content: helpers.parseChildren(token.items ?? [])
    }
  },

  markdownTokenizer: {
    ...orderedListTokenizer,
    tokenize(src, tokens, lexer) {
      if (/^\s*\d/.test(src)) {
        return undefined
      }
      return orderedListTokenizer.tokenize(src, tokens, lexer)
    }
  }
})
