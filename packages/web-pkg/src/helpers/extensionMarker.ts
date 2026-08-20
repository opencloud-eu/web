import { SpaceResource, isShareSpaceResource } from '@opencloud-eu/web-client'
import { hasExtension } from './fileExtension'

/**
 * Locating resources that an app labels as its own. A folder carries a name
 * extension (`New folder.vault`), a space a content type in its
 * `@libre.graph.contentType` drive property (`application/vnd.opencloud.vault`).
 */
export interface ExtensionMarker {
  /** Name extension a folder carries, without the leading dot, e.g. `vault`. */
  extension: string
  /** Drive content type a space carries, e.g. `application/vnd.opencloud.vault`. */
  contentType: string
}

/** Whether a space carries a given content type. */
export function isContentTypeSpace(space: SpaceResource | undefined, contentType: string): boolean {
  return !!contentType && space?.contentType === contentType
}

/**
 * Root path of the folder carrying a given extension within a clear-text path:
 * the first segment with the extension, returned as an absolute path. Null when
 * no segment carries it.
 */
export function findExtensionRootInPath(
  path: string | undefined,
  extension: string
): string | null {
  if (!path) {
    return null
  }
  const segments = path.split('/').filter(Boolean)
  const idx = segments.findIndex((s) => hasExtension(s, extension))
  if (idx === -1) {
    return null
  }
  return '/' + segments.slice(0, idx + 1).join('/')
}

/**
 * Whether the space itself carries the marker, making its root `/` the root
 * for every path inside it. Either via its `@libre.graph.contentType` drive
 * property, or as a directly shared folder.
 */
function isMarkedRootSpace(space: SpaceResource | undefined, marker: ExtensionMarker): boolean {
  if (isContentTypeSpace(space, marker.contentType)) {
    return true
  }
  return !!space && isShareSpaceResource(space) && hasExtension(space.name, marker.extension)
}

/**
 * Find the root path for a (space, path). Two cases:
 *   1. The space itself carries the marker, so its root `/` is the root for
 *      everything inside it.
 *   2. A folder carrying the extension in its path.
 */
export function findExtensionRoot(
  space: SpaceResource | undefined,
  path: string | undefined,
  marker: ExtensionMarker
): string | null {
  if (isMarkedRootSpace(space, marker)) {
    return '/'
  }
  return findExtensionRootInPath(path, marker.extension)
}
