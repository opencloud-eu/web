/**
 * Browser replacement for `dirname` of Node's `path` module (POSIX).
 */
export function dirname(path: string): string {
  const trimmed = path.replace(/\/+$/, '')
  if (!trimmed) {
    return path ? '/' : '.'
  }

  const index = trimmed.lastIndexOf('/')
  if (index === -1) {
    return '.'
  }

  return trimmed.slice(0, index) || '/'
}

/**
 * Browser replacement for `basename` of Node's `path` module (POSIX), without the extension argument.
 */
export function basename(path: string): string {
  const trimmed = path.replace(/\/+$/, '')
  return trimmed.slice(trimmed.lastIndexOf('/') + 1)
}
