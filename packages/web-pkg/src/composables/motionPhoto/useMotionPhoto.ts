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

  // the facet marks an unspecified timestamp as -1
  const getStillTimestampSeconds = (resource: Resource): number | null => {
    const us = Number(resource?.motionPhoto?.presentationTimestampUs)
    if (!Number.isFinite(us) || us < 0) {
      return null
    }
    return us / 1_000_000
  }

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

    // a 200 means the server ignored the Range header and sent the whole file
    const raw: Blob = response?.status === 200 ? body.slice(offset) : body

    // the response is typed image/jpeg (the file's type), which <video> rejects
    const videoBlob = new Blob([raw], { type: 'video/mp4' })
    const url = URL.createObjectURL(videoBlob)
    blobUrlCache.set(resource.id, url)
    return url
  }

  function revoke(resourceId: string): void {
    const url = blobUrlCache.get(resourceId)
    if (!url) {
      return
    }
    URL.revokeObjectURL(url)
    blobUrlCache.delete(resourceId)
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
    revoke,
    revokeAll
  }
}
