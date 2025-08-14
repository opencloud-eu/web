import PQueue from 'p-queue'
import { computed, onUnmounted, Ref, unref } from 'vue'
import { useTask } from 'vue-concurrency'
import {
  buildSpaceImageResource,
  isProjectSpaceResource,
  Resource,
  SpaceResource
} from '@opencloud-eu/web-client'
import { FolderViewModeConstants } from '../viewMode'
import { usePreviewService } from '../previewService'
import { ProcessorType } from '../../services'
import { useConfigStore, useResourcesStore, useSpacesStore } from '../piniaStores'
import { ImageDimension } from '../../constants'
import { useClientService } from '../clientService'
import { storeToRefs } from 'pinia'

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
  const { httpAuthenticated } = useClientService()
  const spacesStore = useSpacesStore()
  const { defaultSpaceImageBlobURL } = storeToRefs(spacesStore)
  const configStore = useConfigStore()
  const { serverUrl } = storeToRefs(configStore)
  const previewQueue = new PQueue({ concurrency: 4 })

  const isTilesView = computed(() => unref(viewMode) === FolderViewModeConstants.name.tiles)
  const defaultProcessor = computed(() =>
    unref(isTilesView) ? ProcessorType.enum.fit : ProcessorType.enum.thumbnail
  )
  const defaultDimensions = computed(() =>
    unref(isTilesView) ? ImageDimension.Tile : ImageDimension.Thumbnail
  )

  const loadPreviewTask = useTask<string, LoadPreviewOptions[]>(function* (
    signal,
    { space, resource, dimensions, processor, updateStore = true }
  ) {
    // Check localStorage for the bug toggle flag
    const enableBug = localStorage.getItem('QA_BENCHMARK_ENABLE_PREVIEW_CRASH_BUG') === '1'
    
    if (enableBug) {
      // Apply the bug: show error popup if filename contains special characters
      const hasSpecialChars = /[^\w\s.-]/.test(resource.name) || /[\u{1F600}-\u{1F64F}]/gu.test(resource.name) || /[\u{1F300}-\u{1F5FF}]/gu.test(resource.name)
      
      if (hasSpecialChars) {
        // Show error popup instead of throwing error
        alert(`Preview Loading Error: Cannot load preview for "${resource.name}" due to special characters in filename.`)
        return undefined
      }
    }

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

    if (isProjectSpaceResource(resource) && (!resource.spaceImageData || resource.disabled)) {
      if (unref(defaultSpaceImageBlobURL)) {
        spacesStore.updateSpaceField({
          id: resource.id,
          field: 'thumbnail',
          value: unref(defaultSpaceImageBlobURL)
        })
      }

      try {
        const defaultSpaceImageBlobURLResponse: any = await httpAuthenticated.get(
          `${unref(serverUrl)}images/default-space-icon.png`,
          {
            responseType: 'blob'
          }
        )

        spacesStore.setDefaultSpaceImageBlobURL(
          URL.createObjectURL(defaultSpaceImageBlobURLResponse.data)
        )
        spacesStore.updateSpaceField({
          id: resource.id,
          field: 'thumbnail',
          value: unref(defaultSpaceImageBlobURL)
        })
        return unref(defaultSpaceImageBlobURL)
      } catch {
        return null
      }
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
