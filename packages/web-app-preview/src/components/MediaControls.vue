<template>
  <div
    v-if="files.length"
    class="preview-details"
    :class="[{ 'lightbox opacity-90 z-1000': isFullScreenModeActivated }]"
  >
    <div
      class="bg-role-surface-container p-2 w-lg max-w-[80vw] flex flex-wrap items-center justify-around rounded-sm"
    >
      <oc-button
        v-oc-tooltip="previousDescription"
        class="preview-controls-previous raw-hover-surface"
        appearance="raw"
        :aria-label="previousDescription"
        @click="emit('togglePrevious')"
      >
        <oc-icon size="large" name="arrow-drop-left" />
      </oc-button>
      <p v-if="!isFolderLoading" class="m-0 preview-controls-action-count">
        <span aria-hidden="true" v-text="ariaHiddenFileCount" />
        <span class="sr-only" v-text="screenreaderFileCount" />
      </p>
      <oc-button
        v-oc-tooltip="nextDescription"
        class="preview-controls-next raw-hover-surface"
        appearance="raw"
        :aria-label="nextDescription"
        @click="emit('toggleNext')"
      >
        <oc-icon size="large" name="arrow-drop-right" />
      </oc-button>
      <oc-button
        v-oc-tooltip="togglePhotoRollDescription"
        class="raw-hover-surface p-1 hidden md:flex"
        data-testid="toggle-photo-roll"
        appearance="raw"
        :aria-label="togglePhotoRollDescription"
        @click="emit('togglePhotoRoll')"
      >
        <oc-icon name="side-bar" :fill-type="photoRollEnabled ? 'fill' : 'line'" />
      </oc-button>
      <div class="flex">
        <oc-button
          v-oc-tooltip="
            isFullScreenModeActivated ? exitFullScreenDescription : enterFullScreenDescription
          "
          class="preview-controls-fullscreen raw-hover-surface p-1"
          appearance="raw"
          :aria-label="
            isFullScreenModeActivated ? exitFullScreenDescription : enterFullScreenDescription
          "
          @click="emit('toggleFullScreen')"
        >
          <oc-icon
            fill-type="line"
            :name="isFullScreenModeActivated ? 'fullscreen-exit' : 'fullscreen'"
          />
        </oc-button>
      </div>
      <div v-if="showImageControls" class="flex items-center">
        <div class="flex">
          <oc-button
            v-oc-tooltip="imageShrinkDescription"
            class="preview-controls-image-shrink raw-hover-surface p-1"
            appearance="raw"
            :aria-label="imageShrinkDescription"
            @click="emit('setShrink')"
          >
            <oc-icon fill-type="line" name="zoom-out" />
          </oc-button>
          <oc-button
            v-oc-tooltip="imageZoomDescription"
            class="preview-controls-image-zoom raw-hover-surface p-1"
            appearance="raw"
            :aria-label="imageZoomDescription"
            @click="emit('setZoom')"
          >
            <oc-icon fill-type="line" name="zoom-in" />
          </oc-button>
        </div>
        <div class="ml-4">
          <oc-button
            v-oc-tooltip="imageRotateLeftDescription"
            class="preview-controls-rotate-left raw-hover-surface p-1"
            appearance="raw"
            :aria-label="imageRotateLeftDescription"
            @click="emit('setRotationLeft')"
          >
            <oc-icon fill-type="line" name="anticlockwise" />
          </oc-button>
          <oc-button
            v-oc-tooltip="imageRotateRightDescription"
            class="preview-controls-rotate-right raw-hover-surface p-1"
            appearance="raw"
            :aria-label="imageRotateRightDescription"
            @click="emit('setRotationRight')"
          >
            <oc-icon fill-type="line" name="clockwise" />
          </oc-button>
        </div>
        <div class="ml-4">
          <oc-button
            v-oc-tooltip="imageResetDescription"
            class="preview-controls-image-reset raw-hover-surface p-1"
            appearance="raw"
            :aria-label="imageResetDescription"
            @click="emit('resetImage')"
          >
            <oc-icon fill-type="line" name="reset-left" />
          </oc-button>
        </div>
      </div>
      <oc-button
        v-if="showFavoriteButton"
        v-oc-tooltip="resourceFavoriteIconDescription"
        class="preview-controls-favorite raw-hover-surface p-1"
        appearance="raw"
        :aria-label="resourceFavoriteIconDescription"
        @click="favoriteAction?.handler(actionOptions)"
      >
        <oc-icon fill-type="line" :name="resourceFavoriteIcon" />
      </oc-button>
      <oc-button
        v-if="showDeleteButton"
        v-oc-tooltip="resourceDeleteDescription"
        class="preview-controls-delete raw-hover-surface p-1"
        appearance="raw"
        :aria-label="resourceDeleteDescription"
        @click="emit('deleteResource')"
      >
        <oc-icon fill-type="line" :name="resourceDeleteIcon" />
      </oc-button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, unref } from 'vue'
import { useGettext } from 'vue3-gettext'
import {
  ActionExtension,
  ActionOptions,
  isMacOs,
  useFileActionsDelete,
  useExtensionRegistry,
  useGetMatchingSpace
} from '@opencloud-eu/web-pkg'
import { MediaFile } from '../helpers/types'
import { previewToolbarActionsExtensionPoint } from '../extensionPoints'

const {
  files,
  activeIndex = 0,
  photoRollEnabled = true,
  isFullScreenModeActivated = false,
  isFolderLoading = false,
  showImageControls = false,
  currentImageRotation = 0
} = defineProps<{
  files: MediaFile[]
  activeIndex?: number
  isFullScreenModeActivated?: boolean
  isFolderLoading?: boolean
  showImageControls?: boolean
  currentImageRotation?: number
  photoRollEnabled?: boolean
}>()

void currentImageRotation

const emit = defineEmits<{
  (e: 'setRotationLeft'): void
  (e: 'setRotationRight'): void
  (e: 'setShrink'): void
  (e: 'setZoom'): void
  (e: 'toggleFullScreen'): void
  (e: 'toggleNext'): void
  (e: 'togglePrevious'): void
  (e: 'resetImage'): void
  (e: 'deleteResource'): void
  (e: 'togglePhotoRoll'): void
}>()

const { $gettext } = useGettext()
const { getMatchingSpace } = useGetMatchingSpace()
const { requestExtensions } = useExtensionRegistry()
const { actions: deleteFileActions } = useFileActionsDelete()

const space = computed(() => getMatchingSpace(files[activeIndex].resource))
const actionOptions = computed(() => ({
  space: unref(space),
  resources: [files[activeIndex].resource]
}))

const previewToolbarActions = computed(() => {
  return (requestExtensions<ActionExtension>(previewToolbarActionsExtensionPoint) || []).map(
    (e) => e.action
  )
})
const favoriteAction = computed(() => {
  return unref(previewToolbarActions).find((action) => action.name === 'favorite')
})

const ariaHiddenFileCount = computed(() => {
  return $gettext('%{ displayIndex } of %{ availableMediaFiles }', {
    displayIndex: (activeIndex + 1).toString(),
    availableMediaFiles: files.length.toString()
  })
})
const screenreaderFileCount = computed(() => {
  return $gettext('Media file %{ displayIndex } of %{ availableMediaFiles }', {
    displayIndex: (activeIndex + 1).toString(),
    availableMediaFiles: files.length.toString()
  })
})

const togglePhotoRollDescription = computed(() => {
  if (photoRollEnabled) {
    return $gettext('Hide photo roll')
  }
  return $gettext('Show photo roll')
})

const showDeleteButton = computed(() => {
  return unref(deleteFileActions)[0]?.isVisible({
    space: unref(space),
    resources: [files[activeIndex].resource]
  })
})

const showFavoriteButton = computed(() => {
  if (!unref(favoriteAction)) {
    return false
  }
  return unref(favoriteAction).isVisible(unref(actionOptions))
})

const resourceDeleteIcon = computed(() => {
  return unref(deleteFileActions)[0].icon as string
})

const resourceDeleteDescription = computed(() => {
  return $gettext('Delete (%{key})', {
    key: isMacOs() ? $gettext('⌘ + Backspace') : $gettext('Del')
  })
})

const resourceFavoriteIcon = computed(() => {
  return (unref(favoriteAction)?.icon as (options: ActionOptions) => string)?.(unref(actionOptions))
})

const resourceFavoriteIconDescription = computed(() => {
  return unref(favoriteAction)?.label(unref(actionOptions))
})

const enterFullScreenDescription = computed(() => $gettext('Enter full screen mode'))
const exitFullScreenDescription = computed(() => $gettext('Exit full screen mode'))
const imageShrinkDescription = computed(() => $gettext('Shrink the image (⇧ + Mouse wheel)'))
const imageZoomDescription = computed(() => $gettext('Enlarge the image (⇧ + Mouse wheel)'))
const imageResetDescription = computed(() => $gettext('Reset'))
const imageRotateLeftDescription = computed(() =>
  $gettext('Rotate the image 90 degrees to the left')
)
const imageRotateRightDescription = computed(() =>
  $gettext('Rotate the image 90 degrees to the right')
)
const previousDescription = computed(() => $gettext('Show previous media file in folder'))
const nextDescription = computed(() => $gettext('Show next media file in folder'))
</script>
