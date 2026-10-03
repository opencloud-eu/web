import { shallowReactive } from 'vue'
import { tryOnScopeDispose } from '@vueuse/core'
import isEmpty from 'lodash-es/isEmpty'
import { isPublicSpaceResource, Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useClientService } from '../clientService'
import { useResourcesStore } from '../piniaStores'
import { useGetMatchingSpace } from '../spaces'

const PAIRED_VIDEO_SEARCH_LIMIT = 10
const PAIRED_VIDEO_MISSING_TTL_MS = 30_000

type PairedVideo = { resource: Resource; space: SpaceResource }

function isPairedVideoOf(still: Resource, candidate: Resource): boolean {
  return (
    candidate.livePhoto?.contentId === still.livePhoto.contentId &&
    !!candidate.mimeType?.startsWith('video/')
  )
}

export function isMotionPhoto(resource: Resource): boolean {
  return !isEmpty(resource?.motionPhoto)
}

export function isLivePhoto(resource: Resource): boolean {
  return (
    !isMotionPhoto(resource) &&
    !!resource?.livePhoto?.contentId &&
    !!resource.mimeType?.startsWith('image/')
  )
}

export function isMotionOrLivePhoto(resource: Resource): boolean {
  return isMotionPhoto(resource) || isLivePhoto(resource)
}

/**
 * Handles the video of a photo, which is either embedded or paired.
 *
 * Embedded (Google Motion Photo): a still JPEG with a short MP4 video appended
 * to the end of the file. The `motionPhoto` facet exposes `videoSize` (the byte
 * length of that appended video), which lets us fetch just the video with a
 * single HTTP Range request instead of downloading the whole file:
 * `Range: bytes=<offset>-` where `offset = size - videoSize`.
 *
 * Paired (Apple Live Photo): the video is a separate QuickTime file that
 * carries the same `livePhoto.contentId` as the still. It is looked up only
 * when the video is requested and then downloaded as a whole.
 *
 * The composable owns the blob lifecycle: it memoizes the object URL per
 * resource id (so hover + click don't double-fetch) and revokes every URL it
 * created when the owning scope is disposed. The paired video of a live photo
 * is kept the same way.
 */
export function useMotionPhoto() {
  const clientService = useClientService()
  const resourcesStore = useResourcesStore()
  const { getMatchingSpace } = useGetMatchingSpace()
  const blobUrlCache = new Map<string, string>()
  const pairedVideoCache = new Map<string, PairedVideo>()
  const missingPairedVideoTimers = shallowReactive(new Map<string, ReturnType<typeof setTimeout>>())

  // "not found" is only held for a while: right after an upload the server may
  // not have indexed the video yet, so a later attempt can still find it
  function rememberMissingPairedVideo(resourceId: string): void {
    const timer = setTimeout(
      () => missingPairedVideoTimers.delete(resourceId),
      PAIRED_VIDEO_MISSING_TTL_MS
    )
    missingPairedVideoTimers.set(resourceId, timer)
  }

  function forgetPairedVideo(resourceId: string): void {
    clearTimeout(missingPairedVideoTimers.get(resourceId))
    missingPairedVideoTimers.delete(resourceId)
    pairedVideoCache.delete(resourceId)
  }

  function getVideoOffset(resource: Resource): number | null {
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

  function canPlay(resource: Resource): boolean {
    if (isLivePhoto(resource)) {
      return !missingPairedVideoTimers.has(resource.id)
    }
    return getVideoOffset(resource) !== null
  }

  // the motion photo facet marks an unspecified timestamp as -1; a live photo
  // carries the timestamp on its video half only, which is known once resolved
  function getStillTimestampSeconds(resource: Resource, duration?: number): number | null {
    if (isLivePhoto(resource)) {
      const video = pairedVideoCache.get(resource.id)?.resource
      const us = Number(video?.livePhoto?.stillImageTimeUs)
      if (Number.isFinite(us) && us >= 0) {
        return us / 1_000_000
      }
      return Number.isFinite(duration) ? duration / 2 : null
    }
    const us = Number(resource?.motionPhoto?.presentationTimestampUs)
    if (!Number.isFinite(us) || us < 0) {
      return null
    }
    return us / 1_000_000
  }

  function findListedPairedVideo(space: SpaceResource, resource: Resource): PairedVideo | null {
    const listed = resourcesStore.resources.find((candidate) =>
      isPairedVideoOf(resource, candidate)
    )
    if (!listed) {
      return null
    }
    // search results and flat lists mix resources of several spaces
    const isSameSpace = listed.storageId === resource.storageId
    return { resource: listed, space: isSameSpace ? space : getMatchingSpace(listed) }
  }

  async function searchPairedVideo(
    resource: Resource,
    signal?: AbortSignal
  ): Promise<PairedVideo | null> {
    try {
      const { resources } = await clientService.webdav.search(
        `livePhoto.contentId:"${resource.livePhoto.contentId}"`,
        { searchLimit: PAIRED_VIDEO_SEARCH_LIMIT, signal }
      )
      const hit = resources.find(({ mimeType }) => mimeType?.startsWith('video/'))
      if (!hit) {
        return null
      }
      return { resource: hit, space: getMatchingSpace(hit) }
    } catch (error) {
      if (signal?.aborted) {
        throw error
      }
      return null
    }
  }

  async function resolvePairedVideo(
    space: SpaceResource,
    resource: Resource,
    signal?: AbortSignal
  ): Promise<PairedVideo> {
    if (pairedVideoCache.has(resource.id)) {
      return pairedVideoCache.get(resource.id)
    }

    if (!missingPairedVideoTimers.has(resource.id)) {
      const canSearch = !isPublicSpaceResource(space)
      const video =
        findListedPairedVideo(space, resource) ??
        (canSearch ? await searchPairedVideo(resource, signal) : null)
      if (video) {
        pairedVideoCache.set(resource.id, video)
        return video
      }
      rememberMissingPairedVideo(resource.id)
    }
    throw new Error('paired video of the live photo not found')
  }

  async function loadPairedVideo(
    space: SpaceResource,
    resource: Resource,
    signal?: AbortSignal
  ): Promise<Blob> {
    const video = await resolvePairedVideo(space, resource, signal)
    // the id survives a move or rename of the video, public links only know paths
    const { fileId, path } = video.resource
    const file = isPublicSpaceResource(video.space) ? { path } : { fileId }
    try {
      const { body } = await clientService.webdav.getFileContents(video.space, file, {
        responseType: 'blob',
        signal
      })
      return body
    } catch (error) {
      if (!signal?.aborted) {
        pairedVideoCache.delete(resource.id)
      }
      throw error
    }
  }

  async function loadEmbeddedVideo(
    space: SpaceResource,
    resource: Resource,
    signal?: AbortSignal
  ): Promise<Blob> {
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
    return response?.status === 200 ? body.slice(offset) : body
  }

  async function loadVideoUrl(
    space: SpaceResource,
    resource: Resource,
    signal?: AbortSignal
  ): Promise<string> {
    if (blobUrlCache.has(resource.id)) {
      return blobUrlCache.get(resource.id)
    }

    const raw: Blob = isLivePhoto(resource)
      ? await loadPairedVideo(space, resource, signal)
      : await loadEmbeddedVideo(space, resource, signal)

    // the response carries the file's type (image/jpeg or video/quicktime), which
    // <video> rejects; the mp4 demuxers read the QuickTime container as well
    const videoBlob = new Blob([raw], { type: 'video/mp4' })
    const url = URL.createObjectURL(videoBlob)
    blobUrlCache.set(resource.id, url)
    return url
  }

  function revoke(resourceId: string): void {
    forgetPairedVideo(resourceId)
    const url = blobUrlCache.get(resourceId)
    if (!url) {
      return
    }
    URL.revokeObjectURL(url)
    blobUrlCache.delete(resourceId)
  }

  function revokeAll(): void {
    for (const timer of missingPairedVideoTimers.values()) {
      clearTimeout(timer)
    }
    missingPairedVideoTimers.clear()
    pairedVideoCache.clear()
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
