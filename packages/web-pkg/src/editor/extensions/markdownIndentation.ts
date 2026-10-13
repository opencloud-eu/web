export const fenceOpenPattern = /^(`{3,}(?=[^`]*$)|~{3,})/

const TAB_WIDTH = 4

/**
 * Replaces leading tabs with spaces until `column` is reached. A tab crossing
 * `column` is expanded fully, later whitespace is kept, e.g. tabs in code.
 */
export function expandLeadingTabs(line: string, column = Infinity): string {
  let width = 0
  let index = 0
  while (width < column && (line[index] === ' ' || line[index] === '\t')) {
    width = line[index] === '\t' ? width + TAB_WIDTH - (width % TAB_WIDTH) : width + 1
    index++
  }
  return ' '.repeat(width) + line.slice(index)
}

export function isFenceClose(line: string, marker: string): boolean {
  const run = /^(`+|~+)[ \t]*$/.exec(line.trim())?.[1]
  return !!run && run[0] === marker[0] && run.length >= marker.length
}
