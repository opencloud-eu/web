/** Extended search is on, so pass user input through `escapeFuseQuery`. */
export const defaultFuseOptions = {
  ignoreLocation: true,
  threshold: 0,
  useExtendedSearch: true
}

/**
 * Turns user input into an extended search query that matches each word literally,
 * so characters like `!`, `^`, `$`, `=`, `'` and `|` are not read as Fuse operators.
 * Words are still combined with AND.
 */
export function escapeFuseQuery(term: string): string {
  return term
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `'"${word.replace(/\|/g, '\\|')}"`)
    .join(' ')
}
