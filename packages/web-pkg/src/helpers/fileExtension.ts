/**
 * Helpers for the trailing `.<extension>` part of a resource name. Nothing here
 * knows any concrete extension - callers pass in the one they care about.
 */

/** Whether a name carries the given extension. */
export function hasExtension(name: string | undefined, extension: string): boolean {
  return !!name && name.endsWith(`.${extension}`)
}

/** Name with the given extension appended. Idempotent. */
export function withExtension(name: string, extension: string): string {
  return hasExtension(name, extension) ? name : `${name}.${extension}`
}

/** Inverse of `withExtension`: the name without the given extension. */
export function withoutExtension(name: string, extension: string): string {
  return hasExtension(name, extension) ? name.slice(0, -(extension.length + 1)) : name
}
