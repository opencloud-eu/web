import { Resource } from '@opencloud-eu/web-client'
import { mimeTypes } from '../mimeTypes'

/**
 * Browser independent, decides the "open with" action and the carousel. Raster
 * images are shown as a server rendered preview and need one, except in a vault.
 */
export function canOpen(resource: Resource): boolean {
  const mimeType = resource.mimeType?.toLowerCase()
  if (!mimeType || !mimeTypes.includes(mimeType)) {
    return false
  }

  if (!mimeType.startsWith('image/')) {
    return true
  }

  if (mimeType === 'image/svg+xml' || resource.isInVault) {
    return true
  }

  return !!resource.hasPreview?.()
}
