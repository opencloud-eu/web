import type { JSONContent } from '@tiptap/core'
import Paragraph from '@tiptap/extension-paragraph'

/**
 * Line starts that markdown reads as block syntax. Tiptap only escapes inline
 * syntax, so paragraph text like "1. Mai" or "- foo" would come back as a list.
 * `*`, `_`, `` ` ``, `~` and `[` are escaped by tiptap already, `<` and `>` are
 * encoded as entities.
 *
 * FIXME: See https://github.com/ueberdosis/tiptap/issues/8134. These patterns
 * can go once PR #8140 is merged. Trimming leading whitespace in
 * `escapeBlockStart` is not covered by it and has to stay.
 */
const setextOrThematicBreak: [RegExp, string] = [/^(?=-[- \t]*$|=+[ \t]*$)/, '\\']
// `\s` like tiptap's tokenizers, which also match non-breaking spaces
const bulletItem: [RegExp, string] = [/^([-+])(?=\s|$)/, '\\$1']
const atxHeading: [RegExp, string] = [/^(#{1,6})(?=\s|$)/, '\\$1']

const firstLinePatterns: [RegExp, string][] = [
  setextOrThematicBreak,
  bulletItem,
  // tiptap's tokenizer has no digit limit, unlike CommonMark
  [/^(\d+)([.)])(?=\s|$)/, '$1\\$2'],
  // letter or roman ordered list item, as matched by tiptap's tokenizer
  [/^([ivxlcdmIVXLCDM]+|[a-zA-Z]{1,2})([.)])(?=\s)/, '$1\\$2'],
  atxHeading
]

// Only these interrupt a paragraph, e.g. "2. Liga" or "Mr. Smith" further down are text
const continuationLinePatterns: [RegExp, string][] = [
  setextOrThematicBreak,
  bulletItem,
  [/^(1)([.)])(?=\s|$)/, '$1\\$2'],
  atxHeading
]

// GitHub style alert marker, e.g. `> [!NOTE]`, alone on its line
const escapedAlertPattern = /^\\\[!([A-Za-z]+)\\\](?=[ \t]*(\n|$))/

function escapeBlockStart(line: string, patterns: [RegExp, string][]): string {
  // Leading whitespace is dropped by markdown anyway, but four or more spaces
  // turn the line into a code block and after a list it reads as continuation.
  const trimmed = line.replace(/^[ \t]+/, '')
  // Other whitespace like non-breaking spaces stays as text, but tiptap still
  // reads it as indentation in front of a list marker.
  const text = trimmed.trimStart()
  const indent = trimmed.slice(0, trimmed.length - text.length)
  const pattern = patterns.find(([regex]) => regex.test(text))
  return pattern ? indent + text.replace(pattern[0], pattern[1]) : trimmed
}

/**
 * Lines after the first one in a list item are written unindented, any marker
 * there starts a new item.
 */
export function escapeMarkdownBlockStarts(markdown: string, inListItem = false): string {
  return markdown
    .split('\n')
    .map((line, index) =>
      escapeBlockStart(
        line,
        index === 0 || inListItem ? firstLinePatterns : continuationLinePatterns
      )
    )
    .join('\n')
}

/**
 * Markdown drops the indentation of paragraph lines, marked keeps it in the text.
 */
function stripLineIndentation(content: JSONContent[]): JSONContent[] {
  let lineStart = true

  return content.flatMap((node) => {
    if (node.type === 'hardBreak') {
      lineStart = true
      return [node]
    }
    if (node.type !== 'text' || !node.text || node.marks?.some(({ type }) => type === 'code')) {
      lineStart = false
      return [node]
    }
    let text = node.text.replace(/\n[ \t]+/g, '\n')
    if (lineStart) {
      text = text.replace(/^[ \t]+/, '')
    }
    lineStart = text.endsWith('\n')
    return text ? [{ ...node, text }] : []
  })
}

/**
 * Paragraph that keeps its meaning across a markdown round trip.
 */
export const MarkdownParagraph = Paragraph.extend({
  parseMarkdown(token, helpers) {
    const result = this.parent?.(token, helpers)

    if (!result || Array.isArray(result) || !result.content) {
      return result
    }

    return { ...result, content: stripLineIndentation(result.content) }
  },

  renderMarkdown(node, h, ctx) {
    const rendered: string = this.parent?.(node, h, ctx) ?? ''

    if (!node.content?.length) {
      return rendered
    }

    // GFM table cells hold inline content only
    if (ctx.parentType === 'table') {
      return rendered
    }

    const escaped = escapeMarkdownBlockStarts(
      rendered,
      ctx.parentType === 'listItem' || ctx.parentType === 'taskItem'
    )

    if (ctx.parentType === 'blockquote' && ctx.index === 0) {
      return escaped.replace(escapedAlertPattern, '[!$1]')
    }

    return escaped
  }
})
