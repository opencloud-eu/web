import { tryOnScopeDispose } from '@vueuse/core'
import isEmpty from 'lodash-es/isEmpty'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useClientService } from '../clientService'

/**
 * Handles the embedded video of a Google Motion Photo.
 *
 * A Motion Photo is a still JPEG with a short MP4 clip appended to the end of
 * the file. The `motionPhoto` facet exposes `videoSize` (the byte length of
 * that appended clip), which lets us fetch just the video with a single HTTP
 * Range request instead of downloading the whole file: `Range: bytes=<offset>-`
 * where `offset = size - videoSize`.
 *
 * The composable owns the blob lifecycle: it memoizes the object URL per
 * resource id (so hover + click don't double-fetch) and revokes every URL it
 * created when the owning scope is disposed.
 */
export function useMotionPhoto() {
  const clientService = useClientService()
  const blobUrlCache = new Map<string, string>()

  const isMotionPhoto = (resource: Resource): boolean => !isEmpty(resource?.motionPhoto)

  /**
   * Byte offset at which the embedded video starts, or `null` when the resource
   * is not a usable motion photo (missing facet, non-numeric or out-of-range
   * sizes). A `null` offset means "cannot play".
   */
  const getVideoOffset = (resource: Resource): number | null => {
    if (!isMotionPhoto(resource)) {
      return null
    }
    const size = Number(resource.size)
    const videoSize = Number(resource.motionPhoto?.videoSize)
    if (!Number.isFinite(size) || !Number.isFinite(videoSize) || videoSize <= 0) {
      return null
    }
    const offset = size - videoSize
    if (!Number.isFinite(offset) || offset < 0) {
      return null
    }
    return offset
  }

  const canPlay = (resource: Resource): boolean => getVideoOffset(resource) !== null

  /**
   * Timestamp (in seconds) of the video frame that matches the still image, from
   * the facet's `presentationTimestampUs`. Seeking a freshly loaded clip here
   * makes the still -> motion transition seamless. Returns `null` when the facet
   * marks it unspecified (`-1`) or is missing.
   */
  const getStillTimestampSeconds = (resource: Resource): number | null => {
    const us = Number(resource?.motionPhoto?.presentationTimestampUs)
    if (!Number.isFinite(us) || us < 0) {
      return null
    }
    return us / 1_000_000
  }

  /**
   * Fetches the embedded MP4 and returns an object URL for it. Memoized per
   * resource id. Throws when the resource has no playable video (see
   * `getVideoOffset`).
   */
  async function loadVideoUrl(
    space: SpaceResource,
    resource: Resource,
    signal?: AbortSignal
  ): Promise<string> {
    if (blobUrlCache.has(resource.id)) {
      return blobUrlCache.get(resource.id)
    }

    const offset = getVideoOffset(resource)
    if (offset === null) {
      throw new Error('resource is not a playable motion photo')
    }

    const { response, body } = await clientService.webdav.getFileContents(
      space,
      { fileId: resource.fileId, path: resource.path },
      { responseType: 'blob', headers: { Range: `bytes=${offset}-` }, signal }
    )

    // A 206 response body is already just the trailing bytes, but its
    // Content-Type is the whole file's (image/jpeg), which <video> rejects. If
    // the server ignored the Range header (200), it returned the full file, so
    // slice off the leading still image ourselves.
    const raw: Blob = response?.status === 200 ? body.slice(offset) : body

    // re-tag the blob as video/mp4 so <video> accepts it
    const videoBlob = new Blob([raw], { type: 'video/mp4' })
    const url = URL.createObjectURL(videoBlob)
    blobUrlCache.set(resource.id, url)
    return url
  }

  function revokeAll(): void {
    for (const url of blobUrlCache.values()) {
      URL.revokeObjectURL(url)
    }
    blobUrlCache.clear()
  }

  tryOnScopeDispose(revokeAll)

  return {
    isMotionPhoto,
    canPlay,
    getVideoOffset,
    getStillTimestampSeconds,
    loadVideoUrl,
    revokeAll
  }
}
