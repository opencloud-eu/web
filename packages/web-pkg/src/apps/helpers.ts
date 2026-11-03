import type { Resource } from '@opencloud-eu/web-client'
import type { ApplicationFileExtension } from './types'

/**
 * Whether `fileExtension` covers the type of `resource`. Requires matching resource kinds (file or
 * folder), then matches the file extension, or the mime type (or its family, e.g. `image`) if
 * either side has no extension.
 */
export function isResourceSupportedByFileExtension(
  resource: Resource,
  fileExtension: ApplicationFileExtension
): boolean {
  if ((fileExtension.type === 'folder') !== !!resource.isFolder) {
    return false
  }

  if (resource.extension && fileExtension.extension) {
    if (resource.extension.toLowerCase() !== fileExtension.extension.toLowerCase()) {
      return false
    }
  } else if (resource.mimeType && fileExtension.mimeType) {
    const resourceMimeType = resource.mimeType.toLowerCase()
    const extensionMimeType = fileExtension.mimeType.toLowerCase()
    if (
      resourceMimeType !== extensionMimeType &&
      resourceMimeType.split('/')[0] !== extensionMimeType
    ) {
      return false
    }
  } else {
    return false
  }

  return true
}
