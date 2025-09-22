<template>
  <div v-if="isFolderLoading" class="w-full">
    <div class="absolute top-[50%] left-[50%]">
      <oc-spinner :aria-label="$gettext('Loading media file')" size="xlarge" />
    </div>
  </div>
  <div
    v-else
    ref="preview"
    class="flex size-full"
    tabindex="-1"
    @keydown.left="goToPrev"
    @keydown.right="goToNext"
  >
    <div
      class="stage size-full flex flex-col text-center"
      :class="{ lightbox: isFullScreenModeActivated }"
    >
      <div class="stage_media size-full flex justify-center items-center grow overflow-hidden">
        <div v-if="!activeMediaFileCached || activeMediaFileCached.isLoading" class="w-full">
          <div class="absolute top-[50%] left-[50%]">
            <oc-spinner :aria-label="$gettext('Loading media file')" size="xlarge" />
          </div>
        </div>
        <div
          v-else-if="activeMediaFileCached.isError"
          class="w-full flex flex-col items-center justify-center"
        >
          <oc-icon name="file-damage" size="xlarge" color="var(--oc-role-error)" />
          <p>
            {{ $gettext('Failed to load "%{filename}"', { filename: activeMediaFileCached.name }) }}
          </p>
        </div>
        <media-image
          v-else-if="activeMediaFileCached.isImage"
          :file="activeMediaFileCached"
          :current-image-rotation="currentImageRotation"
          :current-image-zoom="currentImageZoom"
          @set-zoom="imageZoom"
          @set-shrink="imageShrink"
        />
        <media-video
          v-else-if="activeMediaFileCached.isVideo"
          :file="activeMediaFileCached"
          :is-auto-play-enabled="isAutoPlayEnabled"
        />
        <media-audio
          v-else-if="activeMediaFileCached.isAudio"
          :file="activeMediaFileCached"
          :resource="activeFilteredFile"
          :is-auto-play-enabled="isAutoPlayEnabled"
        />
      </div>
      <media-controls
        class="stage_controls mx-auto my-4 h-auto"
        :files="filteredFiles"
        :active-index="activeIndex"
        :is-full-screen-mode-activated="isFullScreenModeActivated"
        :is-folder-loading="isFolderLoading"
        :show-image-controls="activeMediaFileCached?.isImage && !activeMediaFileCached?.isError"
        :show-delete-button="isDeleteButtonVisible"
        :current-image-rotation="currentImageRotation"
        :current-image-zoom="currentImageZoom"
        @set-rotation-right="imageRotateRight"
        @set-rotation-left="imageRotateLeft"
        @set-zoom="imageZoom"
        @set-shrink="imageShrink"
        @reset-image="resetImage"
        @toggle-full-screen="toggleFullScreenMode"
        @toggle-previous="goToPrev"
        @toggle-next="goToNext"
        @delete-resource="$emit('delete:resource')"
      />
    </div>
  </div>
</template>
<script lang="ts">
import {
  computed,
  defineComponent,
  ref,
  unref,
  PropType,
  nextTick,
  getCurrentInstance,
  watch,
  Ref
} from 'vue'
import omit from 'lodash-es/omit'
import { IncomingShareResource, Resource } from '@opencloud-eu/web-client'
import {
  AppFileHandlingResult,
  AppFolderHandlingResult,
  FileContext,
  ProcessorType,
  SortDir,
  createFileRouteOptions,
  queryItemAsString,
  sortHelper,
  useRoute,
  useRouteQuery,
  useRouter,
  usePreviewService,
  useGetMatchingSpace,
  isLocationSharesActive,
  useAppNavigation,
  useKeyboardActions,
  Modifier,
  Key,
  useFileActionsDelete
} from '@opencloud-eu/web-pkg'
import MediaControls from './components/MediaControls.vue'
import MediaAudio from './components/Sources/MediaAudio.vue'
import MediaImage from './components/Sources/MediaImage.vue'
import MediaVideo from './components/Sources/MediaVideo.vue'
import { CachedFile } from './helpers/types'
import {
  useFileTypes,
  useFullScreenMode,
  useImageControls,
  usePreviewDimensions
} from './composables'
import { mimeTypes } from './mimeTypes'

export const appId = 'preview'
const PRELOAD_COUNT = 5

export default defineComponent({
  name: 'Preview',
  components: {
    MediaControls,
    MediaAudio,
    MediaImage,
    MediaVideo
  },
  props: {
    activeFiles: { type: Object as PropType<Resource[]>, required: true },
    currentFileContext: { type: Object as PropType<FileContext>, required: true },
    loadFolderForFileContext: {
      type: Function as PropType<AppFolderHandlingResult['loadFolderForFileContext']>,
      required: true
    },
    getUrlForResource: {
      type: Function as PropType<AppFileHandlingResult['getUrlForResource']>,
      required: true
    },
    revokeUrl: { type: Function as PropType<AppFileHandlingResult['revokeUrl']>, required: true },
    isFolderLoading: { type: Boolean, required: true }
  },
  emits: ['update:resource', 'register:onDeleteResourceCallback', 'delete:resource'],
  setup(props, { emit }) {
    const router = useRouter()
    const route = useRoute()
    const contextRouteQuery = useRouteQuery('contextRouteQuery') as unknown as Ref<
      Record<string, string>
    >

    const { isFileTypeAudio, isFileTypeImage, isFileTypeVideo } = useFileTypes()
    const previewService = usePreviewService()
    const { dimensions } = usePreviewDimensions()
    const { getMatchingSpace } = useGetMatchingSpace()
    const { closeApp } = useAppNavigation({ router, currentFileContext: props.currentFileContext })
    const { bindKeyAction, removeKeyAction } = useKeyboardActions()
    const { actions: deleteFileActions } = useFileActionsDelete()

    const activeIndex = ref<number>()
    const cachedFiles = ref<Record<string, CachedFile>>({})
    const folderLoaded = ref(false)
    const isAutoPlayEnabled = ref(true)
    const preview = ref<HTMLElement>()
    const keyBindings: string[] = []

    const space = computed(() => {
      if (!unref(activeFilteredFile)) {
        return null
      }
      return getMatchingSpace(unref(activeFilteredFile))
    })

    const isDeleteButtonVisible = computed(() => {
      if (!unref(space)) {
        return false
      }
      return unref(deleteFileActions)[0]?.isVisible({
        space: unref(space),
        resources: [unref(activeFilteredFile)]
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
        return SortDir.Desc
      }
      return (unref(contextRouteQuery)['sort-dir'] as SortDir) ?? SortDir.Asc
    })

    const fileIdQuery = useRouteQuery('fileId')
    const fileId = computed(() => queryItemAsString(unref(fileIdQuery)))

    const filteredFiles = computed(() => {
      if (!props.activeFiles) {
        return []
      }

      const files = props.activeFiles.filter((file) => {
        if (
          unref(props.currentFileContext.routeQuery)['q_share-visibility'] === 'hidden' &&
          !(file as IncomingShareResource).hidden
        ) {
          return false
        }

        if (
          unref(props.currentFileContext.routeQuery)['q_share-visibility'] !== 'hidden' &&
          (file as IncomingShareResource).hidden
        ) {
          return false
        }

        return mimeTypes.includes(file.mimeType?.toLowerCase()) && file.canDownload()
      })

      return sortHelper(files, [{ name: unref(sortBy) }], unref(sortBy), unref(sortDir))
    })
    const activeFilteredFile = computed(() => {
      return unref(filteredFiles)[unref(activeIndex)]
    })
    const activeMediaFileCached = computed(() => {
      return unref(cachedFiles)[unref(activeFilteredFile)?.id]
    })

    const loadFileIntoCache = async (file: Resource) => {
      if (Object.hasOwn(unref(cachedFiles), file.id)) {
        return
      }

      const cachedFile: CachedFile = {
        id: file.id,
        name: file.name,
        url: undefined,
        ext: file.extension,
        mimeType: file.mimeType,
        isVideo: isFileTypeVideo(file),
        isImage: isFileTypeImage(file),
        isAudio: isFileTypeAudio(file),
        isLoading: ref(true),
        isError: ref(false)
      }
      cachedFiles.value[file.id] = cachedFile

      try {
        if (cachedFile.isImage) {
          cachedFile.url = await previewService.loadPreview(
            {
              space: unref(space),
              resource: file,
              dimensions: unref(dimensions),
              processor: ProcessorType.enum.fit
            },
            false,
            false
          )
          return
        }
        cachedFile.url = await props.getUrlForResource(unref(space), file)
      } catch (e) {
        console.error(e)
        cachedFile.isError.value = true
      } finally {
        cachedFile.isLoading.value = false
      }
    }

    const goToNext = () => {
      if (unref(activeIndex) + 1 >= unref(filteredFiles).length) {
        activeIndex.value = 0
        updateLocalHistory()
        return
      }
      activeIndex.value = unref(activeIndex) + 1
      updateLocalHistory()
    }

    const goToPrev = () => {
      if (unref(activeIndex) === 0) {
        activeIndex.value = unref(filteredFiles).length - 1
        updateLocalHistory()
        return
      }
      activeIndex.value = unref(activeIndex) - 1
      updateLocalHistory()
    }

    const onDeleteResourceCallback = async () => {
      await nextTick()

      if (!unref(filteredFiles).length) {
        return closeApp()
      }
    }

    const updateLocalHistory = () => {
      // this is a rare edge case when browsing quickly through a lot of files
      // we workaround context being null, when useDriveResolver is in loading state
      if (!props.currentFileContext) {
        return
      }

      const { params, query } = createFileRouteOptions(unref(space), unref(activeFilteredFile))
      router.replace({
        ...omit(unref(route), 'fullPath'),
        path: unref(route).fullPath,
        params: { ...unref(route).params, ...params },
        query: { ...unref(route).query, ...query }
      })
    }

    const instance = getCurrentInstance()

    watch(
      () => props.currentFileContext,
      async () => {
        if (!props.currentFileContext) {
          return
        }

        if (!unref(folderLoaded)) {
          await props.loadFolderForFileContext(props.currentFileContext)
          folderLoaded.value = true
        }

        ;(instance.proxy as any).setActiveFile()
      },
      { immediate: true }
    )

    watch(filteredFiles, () => {
      if (!unref(filteredFiles).length) {
        return
      }

      if (unref(activeIndex) >= unref(filteredFiles).length) {
        activeIndex.value = 0
        updateLocalHistory()
      }
    })

    watch(activeFilteredFile, (file) => {
      if (!file) {
        return
      }

      emit('update:resource', file)
    })

    const loading = computed(() => {
      if (props.isFolderLoading) {
        return true
      }
      const file = unref(activeMediaFileCached)
      if (!file) {
        return true
      }
      return unref(file.isLoading)
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

    return {
      ...useImageControls(),
      ...useFullScreenMode(),
      fileId,
      activeFilteredFile,
      activeIndex,
      activeMediaFileCached,
      cachedFiles,
      filteredFiles,
      updateLocalHistory,
      isAutoPlayEnabled,
      preview,
      isFileTypeImage,
      loadFileIntoCache,
      space,
      onDeleteResourceCallback,
      goToNext,
      goToPrev,
      keyBindings,
      bindKeyAction,
      removeKeyAction,
      isDeleteButtonVisible
    }
  },

  watch: {
    activeIndex(newValue, oldValue) {
      if (newValue !== oldValue) {
        this.loadFileIntoCache(this.activeFilteredFile)
        this.preloadImages()
      }

      if (oldValue !== null) {
        this.isAutoPlayEnabled = false
      }

      this.currentImageZoom = 1
      this.currentImageRotation = 0
    }
  },

  mounted() {
    // keep a local history for this component
    window.addEventListener('popstate', this.handleLocalHistoryEvent)
    this.$emit('register:onDeleteResourceCallback', this.onDeleteResourceCallback)
    this.keyBindings.push(
      this.bindKeyAction({ modifier: Modifier.Ctrl, primary: Key.Backspace }, () =>
        this.$emit('delete:resource', this.activeFilteredFile)
      )
    )
    this.keyBindings.push(
      this.bindKeyAction({ primary: Key.Delete }, () =>
        this.$emit('delete:resource', this.activeFilteredFile)
      )
    )
  },

  beforeUnmount() {
    window.removeEventListener('popstate', this.handleLocalHistoryEvent)
    this.keyBindings.forEach((keyBindingId) => {
      this.removeKeyAction(keyBindingId)
    })

    Object.values(this.cachedFiles).forEach((cachedFile) => {
      this.revokeUrl(cachedFile.url)
    })
  },

  methods: {
    setActiveFile() {
      for (let i = 0; i < this.filteredFiles.length; i++) {
        const filterAttr = isLocationSharesActive(this.$router, 'files-shares-with-me')
          ? 'remoteItemId'
          : 'fileId'

        // match the given file id with the filtered files to get the current index
        if (this.filteredFiles[i][filterAttr] === this.fileId) {
          this.activeIndex = i
          return
        }

        this.activeIndex = 0
      }
    },
    // react to PopStateEvent ()
    handleLocalHistoryEvent() {
      this.setActiveFile()
    },
    preloadImages() {
      const preloadFile = (preloadFileIndex: number) => {
        const cycleIndex =
          (((this.activeIndex + preloadFileIndex) % this.filteredFiles.length) +
            this.filteredFiles.length) %
          this.filteredFiles.length

        const file = this.filteredFiles[cycleIndex]
        this.loadFileIntoCache(file)
      }

      for (let followingFileIndex = 1; followingFileIndex <= PRELOAD_COUNT; followingFileIndex++) {
        preloadFile(followingFileIndex)
      }

      for (
        let previousFileIndex = -1;
        previousFileIndex >= PRELOAD_COUNT * -1;
        previousFileIndex--
      ) {
        preloadFile(previousFileIndex)
      }
    }
  }
})
</script>
