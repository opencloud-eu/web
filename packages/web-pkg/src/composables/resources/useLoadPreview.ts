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

export const useLoadPreview = (viewMode?: Ref<string>) => {
  const previewService = usePreviewService()
  const { updateResourceField } = useResourcesStore()
  const spacesStore = useSpacesStore()
  const previewQueue = new PQueue({ concurrency: 4 })

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

    const preview = yield previewQueue.add(() =>
      previewService.loadPreview(
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
    )

    if (preview && updateStore) {
      updateResourceField({ id: resource.id, field: 'thumbnail', value: preview })
    }

    if (isSpaceImage) {
      spacesStore.removeFromImagesLoading(space.id)
    }
    return preview
  })

  const loadPreview = async (options: LoadPreviewOptions) => {
    const { resource, cancelRunning } = options
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

    try {
      return await loadPreviewTask.perform(options)
    } catch (e) {
      // ignore errors on cancel
      if (e !== 'cancel') {
        console.error(e)
      }
    }
  }

  const previewsLoading = computed(() => loadPreviewTask.isRunning)

  const cancelTasks = () => {
    loadPreviewTask.cancelAll()
    previewQueue.clear()
    spacesStore.purgeImagesLoading()
  }

  onUnmounted(cancelTasks)

  return { loadPreview, previewsLoading }
}
