import type { JSONContent } from '@tiptap/core'
import { Markdown, MarkdownManager } from '@tiptap/markdown'

type EncodeTextForMarkdown = (text: string, node: JSONContent, parentNode?: JSONContent) => string

const entityReference = /^&(?:#\d+|#[xX][\da-fA-F]+|[A-Za-z][A-Za-z\d]*);/
const asciiPunctuation = /^[!-/:-@[-`{-~]$/
const alphanumeric = /^[\p{L}\p{N}]$/u
// CommonMark whitespace, `\s` also covers characters other renderers treat as text
const whitespace = /^[\t\n\f\r\p{Zs}]$/u

function isWhitespace(char?: string): boolean {
  return char !== undefined && whitespace.test(char)
}

function isAlphanumeric(char?: string): boolean {
  return char !== undefined && alphanumeric.test(char)
}

/**
 * Escapes text only where markdown would read it as syntax, so plain text like
 * `Q&A`, `a < b`, `snake_case` or `C:\Users` stays as it is in the file.
 * A neighbour outside the text node is unknown and treated as unsafe, as is
 * leading or trailing whitespace of marked text, which tiptap moves outside the
 * mark delimiters. `>` only matters at a line start, the paragraph takes care of it.
 */
export function escapeMarkdownText(text: string, hasMarks = false): string {
  const start = hasMarks ? text.length - text.trimStart().length : 0
  const end = hasMarks ? text.trimEnd().length : text.length

  return text.replace(/[&<\\`*_[\]~]/g, (char, offset: number) => {
    const previous = offset > start ? text[offset - 1] : undefined
    const next = offset + 1 < end ? text[offset + 1] : undefined

    switch (char) {
      case '&':
        return entityReference.test(text.slice(offset)) ? '&amp;' : char
      case '<':
        // tags, comments and autolinks need a character right after `<`
        return isWhitespace(next) ? char : '&lt;'
      case '\\':
        return next === undefined || next === '\n' || asciiPunctuation.test(next) ? '\\\\' : char
      case '_':
        // intraword underscores never delimit emphasis
        return isAlphanumeric(previous) && isAlphanumeric(next) ? char : '\\_'
      case '*':
      case '~':
        return isWhitespace(previous) && isWhitespace(next) ? char : `\\${char}`
      default:
        return `\\${char}`
    }
  })
}

/**
 * FIXME: see https://github.com/ueberdosis/tiptap/issues/8471. tiptap escapes
 * every special character in text, so each save rewrites plain text in the file.
 * Can go once tiptap only escapes where needed.
 */
export function withMinimalTextEscaping(manager: MarkdownManager): MarkdownManager {
  const target = manager as unknown as { encodeTextForMarkdown: EncodeTextForMarkdown }
  const encode = target.encodeTextForMarkdown.bind(manager)

  // tiptap returns text in code untouched, our escaping covers a subset of its characters
  target.encodeTextForMarkdown = (text, node, parentNode) =>
    encode(text, node, parentNode) === text ? text : escapeMarkdownText(text, !!node.marks?.length)

  return manager
}

export const MarkdownWithMinimalTextEscaping = Markdown.extend({
  onBeforeCreate(event) {
    this.parent?.(event)
    withMinimalTextEscaping(this.storage.manager)
  }
})
