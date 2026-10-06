import { onBeforeUnmount, Ref, unref } from 'vue'
import {
  FolderViewerSlotProps,
  ProcessorType,
  useGetMatchingSpace,
  usePreviewService
} from '@opencloud-eu/web-pkg'
import { MediaFile } from '../helpers/types'
import { usePreviewDimensions } from './usePreviewDimensions'

type UseMediaFileLoaderOptions = {
  mediaFiles: Ref<MediaFile[]>
  activeIndex: Ref<number | undefined>
  getUrlForResource: FolderViewerSlotProps['getUrlForResource']
}

/** How often a resolved url is re-resolved when warming it up reveals a stale url. */
const maxLoadAttempts = 2

export const useMediaFileLoader = ({
  mediaFiles,
  activeIndex,
  getUrlForResource
}: UseMediaFileLoaderOptions) => {
  const previewService = usePreviewService()
  const { dimensions } = usePreviewDimensions()
  const { getMatchingSpace } = useGetMatchingSpace()

  // keyed by MediaFile instance and not by resource id: `buildMediaFiles` creates new
  // instances, an id-keyed registry would hand a fresh instance the request of a
  // discarded one and leave it loading forever
  const controllers = new Map<MediaFile, AbortController>()
  const requests = new Map<MediaFile, Promise<void>>()
  // warm-ups must stay referenced until they settled, otherwise the browser is
  // free to drop them mid-flight
  const warmUps = new Map<HTMLImageElement, (isUsable: boolean) => void>()
  let isDisposed = false

  /**
   * Only the preview-service path yields bytes worth preloading: videos and audio must
   * not be downloaded in the background, vault images have no server-side thumbnail
   * (loading one means downloading and decrypting the full original) and SVGs are
   * rendered as a document via `vue-inline-svg` instead of an image.
   */
  const isPreloadable = (mediaFile: MediaFile) => {
    return (
      mediaFile.isImage &&
      !mediaFile.resource.isInVault &&
      mediaFile.mimeType?.toLowerCase() !== 'image/svg+xml'
    )
  }

  /**
   * Pull a remote image into the browser cache so displaying it later is instant. Blob
   * urls already hold the bytes, there's nothing to warm up for them.
   *
   * Resolves to `false` if the url turned out to be stale (signed urls expire while the
   * viewer sits on a file) or the load was aborted on the way. The caller re-resolves
   * stale urls and drops aborted loads.
   */
  const warmImageCache = (mediaFile: MediaFile, signal: AbortSignal): Promise<boolean> => {
    // url resolution may settle after the signal was aborted (not every resolver is
    // signal-aware, e.g. the `downloadURL` shortcut in `getFileUrl`), an abandoned
    // load must not start downloading anything
    if (signal.aborted) {
      return Promise.resolve(false)
    }

    const url = mediaFile.url

    // only the preview-service path yields bytes worth preloading: videos and audio
    // stream through their own element, svg files render via a document fetch and an
    // Image can't decode any of their urls - the failed decode would be misread as
    // a stale url and trigger a pointless re-resolution
    if (!isPreloadable(mediaFile) || !url || url.startsWith('blob:')) {
      return Promise.resolve(true)
    }

    return new Promise<boolean>((resolve) => {
      const image = new Image()
      const settle = (isUsable: boolean) => {
        image.onload = null
        image.onerror = null
        warmUps.delete(image)
        resolve(isUsable)
      }

      // on public links `image.src = url` is what downloads the preview, not the
      // url-resolving requests the signal already covers: aborting must be able
      // to stop this download too
      signal.addEventListener(
        'abort',
        () => {
          settle(false)
          // reassigning src is the only way to cancel an in-flight image fetch
          image.src = ''
        },
        { once: true }
      )

      warmUps.set(image, settle)
      image.onload = () => settle(true)
      image.onerror = () => settle(false)
      image.src = url
    })
  }

  const resolveUrl = (mediaFile: MediaFile, signal: AbortSignal): Promise<string | undefined> => {
    const space = getMatchingSpace(mediaFile.resource)

    // Vault images can't be thumbnailed server-side (the server only holds
    // the ciphertext blob), so skip the preview service and fetch the full
    // image instead - `getUrlForResource` is vault-aware and returns a blob
    // URL with cleartext bytes. Gate strictly on the vault flag: every other
    // image keeps the normal preview-service path, including the legacy
    // no-thumbnail behaviour (do NOT key this off hasPreview(), or plain
    // images the server has no thumbnail for would download the full
    // original on every open).
    const useFullImage =
      mediaFile.isImage && (mediaFile.resource.isInVault || mediaFile.mimeType === 'image/svg+xml')

    if (mediaFile.isImage && !useFullImage) {
      return previewService.loadPreview(
        {
          space,
          resource: mediaFile.resource,
          dimensions: unref(dimensions),
          processor: ProcessorType.enum.fit
        },
        false,
        false,
        signal
      )
    }

    return getUrlForResource(space, mediaFile.resource, { signal })
  }

  const performLoad = async (mediaFile: MediaFile, controller: AbortController) => {
    try {
      for (let attempt = 1; attempt <= maxLoadAttempts; attempt++) {
        mediaFile.url = await resolveUrl(mediaFile, controller.signal)
        mediaFile.isLoading = false
        // a file that recovered from an error must not keep rendering the error state
        mediaFile.isError = false

        const isUsable = await warmImageCache(mediaFile, controller.signal)
        // the warm-up is an optimization, the resolved url still renders the file
        if (isUsable || isDisposed || attempt === maxLoadAttempts) {
          return
        }

        // the warm-up couldn't use the url: either the load was aborted on the way -
        // then the url is dead weight and the file reloads once it becomes relevant
        // again - or the url went stale and is resolved again on the next attempt
        mediaFile.url = undefined
        mediaFile.isLoading = true

        if (controller.signal.aborted) {
          return
        }
      }
    } catch (e) {
      if (e.name === 'CanceledError') {
        return
      }

      console.error(e)
      mediaFile.isError = true
      mediaFile.isLoading = false
    } finally {
      controllers.delete(mediaFile)
      requests.delete(mediaFile)
    }
  }

  const loadPreviewImage = (mediaFile: MediaFile): Promise<void> => {
    if (isDisposed || mediaFile.url) {
      return Promise.resolve()
    }

    const pendingRequest = requests.get(mediaFile)
    if (pendingRequest) {
      return pendingRequest
    }

    const controller = new AbortController()
    controllers.set(mediaFile, controller)

    const request = performLoad(mediaFile, controller)
    requests.set(mediaFile, request)

    return request
  }

  /** Abort in-flight loads that are neither the active file nor one of its neighbors. */
  const cancelStaleLoads = () => {
    const files = unref(mediaFiles)
    const index = unref(activeIndex)
    const keep = new Set<MediaFile>()

    if (files.length && index !== null && index !== undefined) {
      ;[-1, 0, 1].forEach((offset) => {
        const file = files[(index + offset + files.length) % files.length]
        if (file) {
          keep.add(file)
        }
      })
    }

    controllers.forEach((controller, mediaFile) => {
      if (!keep.has(mediaFile)) {
        controller.abort()
      }
    })
  }

  /**
   * Load the files next to the active one so navigating to them is instant. The backward
   * neighbor follows the forward one, it shouldn't compete with the file the user is most
   * likely heading for.
   */
  const preloadNeighbors = () => {
    const files = unref(mediaFiles)
    const index = unref(activeIndex)
    if (files.length < 2 || index === null || index === undefined) {
      return
    }

    // both neighbors are resolved up front so they belong to the position we preload for
    const forward = files[(index + 1) % files.length]
    const backward = files[(index - 1 + files.length) % files.length]
    const seen = new Set<MediaFile>([files[index]])

    const preload = (mediaFile: MediaFile) => {
      if (!mediaFile || seen.has(mediaFile) || !isPreloadable(mediaFile)) {
        return undefined
      }

      seen.add(mediaFile)
      return loadPreviewImage(mediaFile)
    }

    const forwardLoad = preload(forward)
    void Promise.resolve(forwardLoad).finally(() => {
      // the user may have moved on while the forward neighbor was loading: the
      // backward neighbor of the position we started from is irrelevant then
      if (unref(activeIndex) !== index || unref(mediaFiles) !== files) {
        return
      }

      preload(backward)
    })
  }

  const cancelAllLoads = () => {
    isDisposed = true

    controllers.forEach((controller) => controller.abort())
    controllers.clear()

    // settle pending warm-ups, their loads bail out on `isDisposed`
    warmUps.forEach((settle, image) => {
      image.onload = null
      image.onerror = null
      settle(false)
    })
    warmUps.clear()
  }

  onBeforeUnmount(cancelAllLoads)

  return {
    cancelStaleLoads,
    loadPreviewImage,
    preloadNeighbors
  }
}
