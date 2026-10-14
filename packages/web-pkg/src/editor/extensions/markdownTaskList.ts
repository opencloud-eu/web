import { TaskList } from '@tiptap/extension-list'

function takeLines(source: string, count: number): string[] {
  const lines: string[] = []
  let start = 0

  while (lines.length < count) {
    const end = source.indexOf('\n', start)
    if (end === -1) {
      lines.push(source.slice(start))
      break
    }
    lines.push(source.slice(start, end))
    start = end + 1
  }

  return lines
}

const taskItemLinePattern = /^\s*[-+*]\s+\[[ xX]\]\s+/
const fenceOpenPattern = /^(`{3,}(?=[^`]*$)|~{3,})/

const TAB_WIDTH = 4

/**
 * Replaces leading tabs with spaces until `column` is reached. A tab crossing
 * `column` is expanded fully, later whitespace is kept, e.g. tabs in code.
 */
function expandLeadingTabs(line: string, column = Infinity): string {
  let width = 0
  let index = 0
  while (width < column && (line[index] === ' ' || line[index] === '\t')) {
    width = line[index] === '\t' ? width + TAB_WIDTH - (width % TAB_WIDTH) : width + 1
    index++
  }
  return ' '.repeat(width) + line.slice(index)
}

function isFenceClose(line: string, marker: string): boolean {
  const run = /^(`+|~+)[ \t]*$/.exec(line.trim())?.[1]
  return !!run && run[0] === marker[0] && run.length >= marker.length
}

/**
 * Tiptap counts tabs as one character of indentation and strips a fixed two
 * characters from every line nested in a task item. Leading tabs are expanded up
 * to the item's content column, in fenced code up to the fence's indentation.
 * Lines indented less than the item's content column are moved to it, so no
 * characters get cut. Unlike markdown, such lines then belong to the item.
 *
 * FIXME: see https://github.com/ueberdosis/tiptap/issues/7909. `MarkdownTaskList`
 * can go once tiptap handles tabs and under indented lines.
 */
function normalizeTaskListIndentation(lines: string[]): string[] {
  const itemIndents: number[] = []
  // `shift` is how far the opening fence was moved, its content moves along
  let fence: { marker: string; indent: number; shift: number } | undefined

  return lines.map((line) => {
    if (fence) {
      const current = fence
      if (isFenceClose(line, fence.marker)) {
        fence = undefined
      }
      if (!line.trim()) {
        return line
      }
      return ' '.repeat(current.shift) + expandLeadingTabs(line, current.indent)
    }
    if (!line.trim()) {
      return line
    }

    const expanded = expandLeadingTabs(line)
    const indent = expanded.length - expanded.trimStart().length
    if (taskItemLinePattern.test(line)) {
      while (itemIndents.length && itemIndents[itemIndents.length - 1] >= indent) {
        itemIndents.pop()
      }
      itemIndents.push(indent)
      return expanded
    }

    const ownerIndent = itemIndents.findLast((itemIndent) => itemIndent < indent)
    const contentIndent = ownerIndent === undefined ? indent : ownerIndent + 2
    const shift = Math.max(contentIndent - indent, 0)
    const marker = fenceOpenPattern.exec(expanded.trimStart())?.[1]
    if (marker) {
      fence = { marker, indent, shift }
    }
    // Tabs past the content column belong to the content, e.g. an indented code block
    return shift
      ? ' '.repeat(contentIndent) + expanded.trimStart()
      : expandLeadingTabs(line, contentIndent)
  })
}

function consumedLineCount(raw: string): number {
  return raw.replace(/\n$/, '').split('\n').length
}

const taskListTokenizer = TaskList.config.markdownTokenizer

export const MarkdownTaskList = TaskList.extend({
  markdownTokenizer: {
    ...taskListTokenizer,
    tokenize(src, tokens, lexer) {
      const token = taskListTokenizer.tokenize(src, tokens, lexer)
      if (!token) {
        return token
      }

      const lines = takeLines(src, consumedLineCount(token.raw))
      const normalized = normalizeTaskListIndentation(lines)
      if (normalized.every((line, index) => line === lines[index])) {
        return token
      }

      // Lexes nested content a second time. The discarded first token leaves
      // entries in marked's inline queue, which is harmless.
      const rest = src.slice(lines.join('\n').length)
      const normalizedToken = taskListTokenizer.tokenize(
        normalized.join('\n') + rest,
        tokens,
        lexer
      )
      if (!normalizedToken) {
        return token
      }

      // `raw` tells marked how much of `src` was consumed
      const raw = takeLines(src, consumedLineCount(normalizedToken.raw)).join('\n')
      return { ...normalizedToken, raw: src.length > raw.length ? `${raw}\n` : raw }
    }
  }
})
