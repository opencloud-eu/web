import type { Resource } from '@opencloud-eu/web-client'
import type { ResourceEditorExtension } from '../../composables/piniaStores'

/** Matches a mime type against an exact pattern or a `family/*` glob. */
export function matchesMimePattern(mime: string, pattern: string): boolean {
  if (pattern === mime) return true
  if (pattern.endsWith('/*')) {
    const family = pattern.slice(0, -2)
    return mime.startsWith(family + '/')
  }
  return false
}

/**
 * Picks the best matching `resourceEditor` extension for a resource via
 * `matches()` callback, file extension or mime type. A `hasPriority`
 * candidate wins ties.
 */
export function resolveResourceEditor(
  resource: Resource,
  candidates: ResourceEditorExtension[]
): ResourceEditorExtension | undefined {
  const ext = resource.extension?.toLowerCase()
  const mime = resource.mimeType?.toLowerCase()
  const matches = candidates.filter((e) => {
    if (e.matches?.(resource)) return true
    if (ext && e.extensions?.includes(ext)) return true
    if (mime && e.mimeTypes?.some((p) => matchesMimePattern(mime, p))) return true
    return false
  })
  return matches.find((e) => e.hasPriority) ?? matches[0]
}
