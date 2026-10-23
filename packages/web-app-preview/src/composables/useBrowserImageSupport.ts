import { Resource } from '@opencloud-eu/web-client'
import avifProbe from '../assets/probes/avif.avif?inline'
import heicProbe from '../assets/probes/heic.heic?inline'
import tiffProbe from '../assets/probes/tiff.tif?inline'

/** Formats whose support differs between browsers, probed by decoding a 2x2 image. */
const probes: Record<string, string> = {
  'image/avif': avifProbe,
  'image/heic': heicProbe,
  'image/tiff': tiffProbe
}

/** heif and the sequence types share the heic container */
const probeFor: Record<string, string> = {
  'image/avif': 'image/avif',
  'image/heic': 'image/heic',
  'image/heic-sequence': 'image/heic',
  'image/heif': 'image/heic',
  'image/heif-sequence': 'image/heic',
  'image/tiff': 'image/tiff'
}

export const useBrowserImageSupport = () => {
  const results = new Map<string, boolean>()

  const probed = Promise.all(
    Object.entries(probes).map(async ([format, src]: [string, string]): Promise<void> => {
      results.set(format, await decodes(src))
    })
  ).then((): void => undefined)

  const canDecode = (mimeType: string): boolean => {
    const probe = probeFor[mimeType?.toLowerCase()]
    if (!probe) {
      return true
    }

    return results.get(probe) ?? false
  }

  /** Whether this browser renders an opened file. Only vault images depend on it. */
  const canRender = (resource: Resource): boolean => {
    const mimeType = resource.mimeType?.toLowerCase()
    if (!resource.isInVault || !mimeType?.startsWith('image/')) {
      return true
    }

    return canDecode(mimeType)
  }

  return { probed, canRender }
}

function decodes(src: string): Promise<boolean> {
  if (typeof Image === 'undefined') {
    return Promise.resolve(false)
  }

  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve(true)
    image.onerror = () => resolve(false)
    image.src = src
  })
}
