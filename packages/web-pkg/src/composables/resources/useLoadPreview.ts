import PQueue from 'p-queue'
import { computed, onUnmounted, Ref, unref } from 'vue'
import { useTask } from 'vue-concurrency'
import {
  buildSpaceImageResource,
  isProjectSpaceResource,
  Resource,
  SpaceResource
} from '@opencloud-eu/web-client'
import { FolderViewModeConstants, useTileSize } from '../viewMode'
import { usePreviewService } from '../previewService'
import { ProcessorType } from '../../services'
import { useResourcesStore, useSpacesStore } from '../piniaStores'
import { ImageDimension } from '../../constants'

type LoadPreviewOptions = {
  space: SpaceResource
  resource: Resource
  dimensions?: [number, number]
  processor?: ProcessorType

  /**
   * Cancel potential running tasks before loading.
   * Recommended when loading one preview at a time (hence not in a file list).
   * @default false
   */
  cancelRunning?: boolean

  /**
   * Update resource store after loading.
   * Recommended when loading previews in a file list.
   * @default true
   */
  updateStore?: boolean
}

type PreviewProfile = {
  dimensions: [number, number]
  processor: ProcessorType
}

type QueuedPreview = {
  controller: AbortController
  isRunning: boolean
  profile: PreviewProfile
}

export const useLoadPreview = (viewMode?: Ref<string>) => {
  const previewService = usePreviewService()
  const { updateResourceField } = useResourcesStore()
  const spacesStore = useSpacesStore()
  const previewQueue = new PQueue({ concurrency: 4 })
  const queuedPreviews = new Map<string, QueuedPreview>()
  const loadedPreviewProfiles = new Map<string, PreviewProfile>()

  const isTilesView = computed(() => unref(viewMode) === FolderViewModeConstants.name.tiles)
  const defaultProcessor = computed(() =>
    unref(isTilesView) ? ProcessorType.enum.fit : ProcessorType.enum.thumbnail
  )
  const { previewDimensions } = useTileSize()
  const defaultDimensions = computed<[number, number]>(() =>
    unref(isTilesView) ? unref(previewDimensions) : ImageDimension.Thumbnail
  )

  const isProfileCompatible = (loaded: PreviewProfile, requested: PreviewProfile) => {
    return (
      loaded.processor === requested.processor &&
      loaded.dimensions[0] >= requested.dimensions[0] &&
      loaded.dimensions[1] >= requested.dimensions[1]
    )
  }

  const loadPreviewTask = useTask<string, LoadPreviewOptions[]>(function* (
    signal,
    { space, resource, dimensions, processor, updateStore = true }
  ) {
    const item = isProjectSpaceResource(resource) ? buildSpaceImageResource(resource) : resource
    const isSpaceImage = item.id === space.spaceImageData?.id
    const profile: PreviewProfile = {
      dimensions: dimensions || unref(defaultDimensions),
      processor: processor || unref(defaultProcessor)
    }

    if (isSpaceImage) {
      spacesStore.addToImagesLoading(space.id)
    }

    const queued: QueuedPreview = {
      controller: new AbortController(),
      isRunning: false,
      profile
    }
    queuedPreviews.set(resource.id, queued)

    try {
      const preview = yield previewQueue.add(
        () => {
          queued.isRunning = true
          return previewService.loadPreview(
            {
              space,
              resource: item,
              processor: processor || unref(defaultProcessor),
              dimensions: dimensions || unref(defaultDimensions)
            },
            true,
            true,
            signal
          )
        },
        { signal: queued.controller.signal }
      )

      if (preview && updateStore) {
        updateResourceField({ id: resource.id, field: 'thumbnail', value: preview })
        loadedPreviewProfiles.set(resource.id, profile)
      }

      return preview
    } finally {
      queuedPreviews.delete(resource.id)

      if (isSpaceImage) {
        spacesStore.removeFromImagesLoading(space.id)
      }
    }
  })

  const loadPreview = async (options: LoadPreviewOptions) => {
    const { resource, cancelRunning, updateStore = true } = options
    if (cancelRunning) {
      cancelTasks()
    }

    // Vault files are ciphertext blobs server-side, so no thumbnail to fetch
    if (resource?.isInVault) {
      return
    }

    if (isProjectSpaceResource(resource) && (!resource.spaceImageData || resource.disabled)) {
      return null
    }

    const dimensions = options.dimensions || unref(defaultDimensions)
    const processor = options.processor || unref(defaultProcessor)
    const profile: PreviewProfile = { dimensions, processor }

    // already queued or running, no need to load it twice
    const queued = queuedPreviews.get(resource.id)
    if (queued) {
      if (isProfileCompatible(queued.profile, profile)) {
        return
      }
      if (!queued.isRunning) {
        queued.controller.abort()
      }
    }

    // store-backed previews can be reused if they were loaded with a compatible profile
    const loadedProfile = loadedPreviewProfiles.get(resource.id)
    if (
      updateStore &&
      resource.thumbnail &&
      loadedProfile &&
      isProfileCompatible(loadedProfile, profile)
    ) {
      return resource.thumbnail
    }

    try {
      return await loadPreviewTask.perform({
        ...options,
        dimensions,
        processor
      })
    } catch (e) {
      // ignore errors on cancel or when the preview was dropped while queued
      if (e !== 'cancel' && (e as Error)?.name !== 'AbortError') {
        console.error(e)
      }
    }
  }

  /**
   * Remove a still queued preview from the queue, e.g. because the resource left the viewport.
   * Running requests are left alone, their bytes are already paid for.
   */
  const dropPreview = (resource: Resource) => {
    const queued = queuedPreviews.get(resource.id)
    if (!queued || queued.isRunning) {
      return
    }

    queued.controller.abort()
    loadedPreviewProfiles.delete(resource.id)
  }

  const previewsLoading = computed(() => loadPreviewTask.isRunning)

  const cancelTasks = () => {
    loadPreviewTask.cancelAll()
    previewQueue.clear()
    queuedPreviews.clear()
    loadedPreviewProfiles.clear()
    spacesStore.purgeImagesLoading()
  }

  onUnmounted(cancelTasks)

  return { loadPreview, dropPreview, previewsLoading }
}
