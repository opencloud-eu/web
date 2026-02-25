<template>
  <div v-if="isFolderLoading" class="w-full">
    <div class="absolute top-[50%] left-[50%]">
      <oc-spinner :aria-label="$gettext('Loading media file')" size="xlarge" />
    </div>
  </div>
  <div
    v-else
    ref="preview"
    class="!flex size-full"
    tabindex="-1"
    @keydown.left="goToPrev"
    @keydown.right="goToNext"
    @keydown.down="goToNext"
    @keydown.up="goToPrev"
  >
    <photo-roll
      v-if="photoRollEnabled"
      class="bg-role-surface-container w-1/5 hidden md:block"
      :items="mediaFiles"
      :active-index="activeIndex"
      @select="onSelectPhotoRollItem"
    />
    <div
      class="stage size-full flex flex-col text-center"
      :class="{ lightbox: isFullScreenModeActivated }"
    >
      <div class="stage_media size-full flex justify-center items-center grow overflow-hidden">
        <div v-if="!activeMediaFile || activeMediaFile.isLoading" class="w-full">
          <div class="absolute top-[50%] left-[50%]">
            <oc-spinner :aria-label="$gettext('Loading media file')" size="xlarge" />
          </div>
        </div>
        <div
          v-else-if="activeMediaFile.isError"
          class="w-full flex flex-col items-center justify-center"
        >
          <oc-icon name="file-damage" size="xlarge" color="var(--oc-role-error)" />
          <p>
            {{ $gettext('Failed to load "%{filename}"', { filename: activeMediaFile.name }) }}
          </p>
        </div>
        <media-image
          v-else-if="activeMediaFile.isImage"
          :file="activeMediaFile"
          :current-image-rotation="currentImageRotation"
        />
        <media-video
          v-else-if="activeMediaFile.isVideo"
          :file="activeMediaFile"
          :is-auto-play-enabled="isAutoPlayEnabled"
        />
        <media-audio
          v-else-if="activeMediaFile.isAudio"
          :file="activeMediaFile"
          :is-auto-play-enabled="isAutoPlayEnabled"
        />
      </div>
      <media-controls
        class="stage_controls mx-auto my-4 h-auto"
        :files="mediaFiles"
        :active-index="activeIndex"
        :is-full-screen-mode-activated="isFullScreenModeActivated"
        :is-folder-loading="isFolderLoading"
        :show-image-controls="activeMediaFile?.isImage && !activeMediaFile?.isError"
        :show-delete-button="isDeleteButtonVisible"
        :current-image-rotation="currentImageRotation"
        :photo-roll-enabled="photoRollEnabled"
        @set-rotation-right="imageRotateRight"
        @set-rotation-left="imageRotateLeft"
        @set-zoom="imageZoom"
        @set-shrink="imageShrink"
        @reset-image="resetImage"
        @toggle-full-screen="toggleFullScreenMode"
        @toggle-previous="goToPrev"
        @toggle-next="goToNext"
        @delete-resource="$emit('delete:resource')"
        @toggle-photo-roll="photoRollEnabled = !photoRollEnabled"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  Ref,
  unref,
  useTemplateRef,
  watch
} from 'vue'
import omit from 'lodash-es/omit'
import { IncomingShareResource, Resource } from '@opencloud-eu/web-client'
import {
  AppFileHandlingResult,
  AppFolderHandlingResult,
  createFileRouteOptions,
  determineResourceTableSortFields,
  FileContext,
  isLocationSharesActive,
  Key,
  Modifier,
  ProcessorType,
  queryItemAsString,
  sortHelper,
  useAppNavigation,
  useFileActionsDelete,
  useGetMatchingSpace,
  useKeyboardActions,
  usePreviewService,
  useRoute,
  useRouteQuery,
  useRouter
} from '@opencloud-eu/web-pkg'
import MediaControls from './components/MediaControls.vue'
import MediaAudio from './components/Sources/MediaAudio.vue'
import MediaImage from './components/Sources/MediaImage.vue'
import MediaVideo from './components/Sources/MediaVideo.vue'
import PhotoRoll from './components/PhotoRoll.vue'
import { MediaFile } from './helpers/types'
import {
  useFileTypes,
  useFullScreenMode,
  useImageControls,
  usePreviewDimensions
} from './composables'
import { mimeTypes } from './mimeTypes'
import { RouteLocationRaw } from 'vue-router'
import { SortDir } from '@opencloud-eu/design-system/helpers'

const {
  activeFiles,
  currentFileContext,
  loadFolderForFileContext,
  getUrlForResource,
  revokeUrl,
  isFolderLoading
} = defineProps<{
  activeFiles: Resource[]
  currentFileContext: FileContext
  loadFolderForFileContext: AppFolderHandlingResult['loadFolderForFileContext']
  getUrlForResource: AppFileHandlingResult['getUrlForResource']
  revokeUrl: AppFileHandlingResult['revokeUrl']
  isFolderLoading: boolean
}>()

const emit = defineEmits<{
  (e: 'update:resource', resource: Resource): void
  (e: 'delete:resource'): void
  (e: 'register:onDeleteResourceCallback', callback: () => Promise<void>): void
}>()

const router = useRouter()
const route = useRoute()
const contextRouteQuery = useRouteQuery('contextRouteQuery') as unknown as Ref<
  Record<string, string>
>

const { isFileTypeAudio, isFileTypeImage, isFileTypeVideo } = useFileTypes()
const previewService = usePreviewService()
const { dimensions } = usePreviewDimensions()
const { getMatchingSpace } = useGetMatchingSpace()
const { closeApp } = useAppNavigation({ router, currentFileContext })
const { bindKeyAction, removeKeyAction } = useKeyboardActions()
const { actions: deleteFileActions } = useFileActionsDelete()
const {
  currentImageRotation,
  imageShrink,
  imageZoom,
  imageRotateLeft,
  imageRotateRight,
  resetImage
} = useImageControls()
const { isFullScreenModeActivated, toggleFullScreenMode } = useFullScreenMode()

const activeIndex = ref<number>()
const mediaFiles = ref<MediaFile[]>([])
const folderLoaded = ref(false)
const isAutoPlayEnabled = ref(true)
const photoRollEnabled = ref(true)
const preview = useTemplateRef<HTMLElement>('preview')
const keyBindings: string[] = []
let loadPreviewImageController: AbortController = null

const space = computed(() => {
  if (!unref(activeMediaFile)) {
    return null
  }
  return getMatchingSpace(unref(activeMediaFile).resource)
})

const isDeleteButtonVisible = computed(() => {
  if (!unref(space)) {
    return false
  }
  return unref(deleteFileActions)[0]?.isVisible({
    space: unref(space),
    resources: [unref(activeMediaFile).resource]
  })
})

const sortBy = computed(() => {
  if (!unref(contextRouteQuery)) {
    return 'name'
  }
  return unref(contextRouteQuery)['sort-by'] ?? 'name'
})
const sortDir = computed<SortDir>(() => {
  if (!unref(contextRouteQuery)) {
    return SortDir.Asc
  }
  return (unref(contextRouteQuery)['sort-dir'] as SortDir) ?? SortDir.Asc
})

const fileIdQuery = useRouteQuery('fileId')
const fileId = computed(() => queryItemAsString(unref(fileIdQuery)))

const buildMediaFiles = () => {
  if (!activeFiles) {
    return
  }

  const filteredFiles = activeFiles.filter((file) => {
    if (
      unref(currentFileContext.routeQuery)?.['q_share-visibility'] === 'hidden' &&
      !(file as IncomingShareResource).hidden
    ) {
      return false
    }

    if (
      unref(currentFileContext.routeQuery)?.['q_share-visibility'] !== 'hidden' &&
      (file as IncomingShareResource).hidden
    ) {
      return false
    }

    return mimeTypes.includes(file.mimeType?.toLowerCase()) && file.canDownload()
  })

  const sortFields = determineResourceTableSortFields(filteredFiles[0])
  const sortedFiles = sortHelper(filteredFiles, sortFields, unref(sortBy), unref(sortDir))

  mediaFiles.value = sortedFiles.map((file) => {
    return {
      id: file.id,
      name: file.name,
      ext: file.extension,
      mimeType: file.mimeType,
      isVideo: isFileTypeVideo(file),
      isImage: isFileTypeImage(file),
      isAudio: isFileTypeAudio(file),
      isLoading: true,
      isError: false,
      resource: file
    }
  })
}

const activeMediaFile = computed(() => {
  return unref(mediaFiles)[unref(activeIndex)]
})

const loading = computed(() => {
  if (isFolderLoading) {
    return true
  }
  const file = unref(activeMediaFile)
  if (!file) {
    return true
  }
  return unref(file.isLoading)
})

const loadPreviewImage = async (mediaFile: MediaFile) => {
  if (mediaFile.url) {
    return
  }

  if (loadPreviewImageController) {
    loadPreviewImageController.abort()
  }

  loadPreviewImageController = new AbortController()

  try {
    if (mediaFile.isImage) {
      mediaFile.url = await previewService.loadPreview(
        {
          space: unref(space),
          resource: mediaFile.resource,
          dimensions: unref(dimensions),
          processor: ProcessorType.enum.fit
        },
        false,
        false,
        loadPreviewImageController.signal
      )
    } else {
      mediaFile.url = await getUrlForResource(unref(space), mediaFile.resource, {
        signal: loadPreviewImageController.signal
      })
    }

    mediaFile.isLoading = false
  } catch (e) {
    if (e.name === 'CanceledError') {
      return
    }

    console.error(e)
    mediaFile.isError = true
    mediaFile.isLoading = false
  } finally {
    loadPreviewImageController = null
  }
}

const goToNext = () => {
  if (unref(activeIndex) + 1 >= unref(mediaFiles).length) {
    activeIndex.value = 0
    updateLocalHistory()
    return
  }
  activeIndex.value = unref(activeIndex) + 1
  updateLocalHistory()
}

const goToPrev = () => {
  if (unref(activeIndex) === 0) {
    activeIndex.value = unref(mediaFiles).length - 1
    updateLocalHistory()
    return
  }
  activeIndex.value = unref(activeIndex) - 1
  updateLocalHistory()
}

const onDeleteResourceCallback = async () => {
  await nextTick()

  if (!unref(mediaFiles).length) {
    return closeApp()
  }
}

const updateLocalHistory = () => {
  // this is a rare edge case when browsing quickly through a lot of files
  // we workaround context being null, when useDriveResolver is in loading state
  if (!currentFileContext) {
    return
  }

  const { params, query } = createFileRouteOptions(unref(space), unref(activeMediaFile).resource)
  router.replace({
    ...omit(unref(route), 'fullPath'),
    path: unref(route).fullPath,
    params: { ...unref(route).params, ...params },
    query: { ...unref(route).query, ...query }
  } as RouteLocationRaw)
}

const setActiveFile = () => {
  for (let i = 0; i < unref(mediaFiles).length; i++) {
    const filterAttr = isLocationSharesActive(router, 'files-shares-with-me')
      ? 'remoteItemId'
      : 'fileId'

    // match the given file id with the filtered files to get the current index
    if (unref(mediaFiles)[i].resource[filterAttr] === unref(fileId)) {
      activeIndex.value = i
      return
    }

    activeIndex.value = 0
  }
}

const onSelectPhotoRollItem = (index: number) => {
  activeIndex.value = index
  updateLocalHistory()
}

watch(
  () => currentFileContext,
  async () => {
    if (!currentFileContext) {
      return
    }

    if (!unref(folderLoaded)) {
      await loadFolderForFileContext(currentFileContext)
      folderLoaded.value = true
    }

    setActiveFile()
  },
  { immediate: true }
)

watch(
  () => activeFiles,
  () => {
    buildMediaFiles()

    if (unref(mediaFiles).length && unref(activeIndex) >= unref(mediaFiles).length) {
      activeIndex.value = 0
      updateLocalHistory()
    }
  },
  { immediate: true }
)

watch(activeMediaFile, (newValue, oldValue) => {
  if (!unref(activeMediaFile)) {
    return
  }

  loadPreviewImage(unref(activeMediaFile))
  currentImageRotation.value = 0

  if (oldValue !== null) {
    isAutoPlayEnabled.value = false
  }

  emit('update:resource', unref(activeMediaFile).resource)
})

watch(
  loading,
  async (loading) => {
    if (!loading) {
      await nextTick()
      unref(preview).focus()
    }
  },
  { immediate: true }
)

onMounted(() => {
  // keep a local history for this component
  window.addEventListener('popstate', setActiveFile)
  emit('register:onDeleteResourceCallback', onDeleteResourceCallback)
  keyBindings.push(
    bindKeyAction({ modifier: Modifier.Ctrl, primary: Key.Backspace }, () =>
      emit('delete:resource')
    )
  )
  keyBindings.push(bindKeyAction({ primary: Key.Delete }, () => emit('delete:resource')))
})

onBeforeUnmount(() => {
  window.removeEventListener('popstate', setActiveFile)
  keyBindings.forEach((keyBindingId) => {
    removeKeyAction(keyBindingId)
  })

  Object.values(unref(mediaFiles)).forEach((cachedFile) => {
    revokeUrl(unref(cachedFile.url))
  })

  loadPreviewImageController?.abort()
})
</script>
