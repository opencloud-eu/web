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

type QueuedPreview = {
  controller: AbortController
  isRunning: boolean
}

export const useLoadPreview = (viewMode?: Ref<string>) => {
  const previewService = usePreviewService()
  const { updateResourceField } = useResourcesStore()
  const spacesStore = useSpacesStore()
  const previewQueue = new PQueue({ concurrency: 4 })
  const queuedPreviews = new Map<string, QueuedPreview>()

  const isTilesView = computed(() => unref(viewMode) === FolderViewModeConstants.name.tiles)
  const defaultProcessor = computed(() =>
    unref(isTilesView) ? ProcessorType.enum.fit : ProcessorType.enum.thumbnail
  )
  const { previewDimensions } = useTileSize()
  const defaultDimensions = computed<[number, number]>(() =>
    unref(isTilesView) ? unref(previewDimensions) : ImageDimension.Thumbnail
  )

  const loadPreviewTask = useTask<string, LoadPreviewOptions[]>(function* (
    signal,
    { space, resource, dimensions, processor, updateStore = true }
  ) {
    const item = isProjectSpaceResource(resource) ? buildSpaceImageResource(resource) : resource
    const isSpaceImage = item.id === space.spaceImageData?.id

    if (isSpaceImage) {
      spacesStore.addToImagesLoading(space.id)
    }

    const queued: QueuedPreview = { controller: new AbortController(), isRunning: false }
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

    // already queued or running, no need to load it twice
    if (queuedPreviews.has(resource.id)) {
      return
    }

    // store-backed previews are loaded once, direct callers may want other dimensions
    if (updateStore && resource.thumbnail) {
      return resource.thumbnail
    }

    try {
      return await loadPreviewTask.perform(options)
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
  }

  const previewsLoading = computed(() => loadPreviewTask.isRunning)

  const cancelTasks = () => {
    loadPreviewTask.cancelAll()
    previewQueue.clear()
    queuedPreviews.clear()
    spacesStore.purgeImagesLoading()
  }

  onUnmounted(cancelTasks)

  return { loadPreview, dropPreview, previewsLoading }
}
