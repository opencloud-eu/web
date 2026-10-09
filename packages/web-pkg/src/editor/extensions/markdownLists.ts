import type { JSONContent, MarkdownToken } from '@tiptap/core'
import { ListItem, OrderedList } from '@tiptap/extension-list'
import { Tokenizer } from 'marked'
import type { Marked } from 'marked'

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

const emptyFirstItemPattern = /^( {0,3}(?:[-+*]|\d{1,9}[.)]))[ \t]+(?=\n|$)/

/**
 * Marked starts no list at a marker followed by whitespace only, e.g. the `- ` of
 * an empty first item. That line becomes paragraph text and gets escaped on save.
 * Marked's list tokenizer gets the list without that whitespace instead.
 *
 * Takes the instance as an argument for the same reason as `registerFrontmatterTokenizer`.
 */
export function registerMarkdownListTokenizer(instance: Marked): void {
  instance.use({
    tokenizer: {
      list(src) {
        const match = emptyFirstItemPattern.exec(src)
        if (!match) {
          return false
        }

        const token = Tokenizer.prototype.list.call(this, match[1] + src.slice(match[0].length))
        if (!token) {
          return false
        }

        const trimmed = match[0].length - match[1].length
        return { ...token, raw: src.slice(0, token.raw.length + trimmed) }
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
