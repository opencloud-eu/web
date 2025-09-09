<template>
  <div
    class="preview-details"
    :class="[{ 'lightbox opacity-90 z-1000': isFullScreenModeActivated }]"
  >
    <div class="bg-role-surface-container p-2 w-lg flex items-center justify-around rounded-sm">
      <oc-button
        v-oc-tooltip="previousDescription"
        class="preview-controls-previous raw-hover-surface"
        appearance="raw"
        :aria-label="previousDescription"
        @click="$emit('togglePrevious')"
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
        @click="$emit('toggleNext')"
      >
        <oc-icon size="large" name="arrow-drop-right" />
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
          @click="$emit('toggleFullScreen')"
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
            @click="imageShrink"
          >
            <oc-icon fill-type="line" name="zoom-out" />
          </oc-button>
          <oc-button
            v-oc-tooltip="imageZoomDescription"
            class="preview-controls-image-zoom raw-hover-surface p-1"
            appearance="raw"
            :aria-label="imageZoomDescription"
            @click="imageZoom"
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
            @click="imageRotateLeft"
          >
            <oc-icon fill-type="line" name="anticlockwise" />
          </oc-button>
          <oc-button
            v-oc-tooltip="imageRotateRightDescription"
            class="preview-controls-rotate-right raw-hover-surface p-1"
            appearance="raw"
            :aria-label="imageRotateRightDescription"
            @click="imageRotateRight"
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
            @click="$emit('resetImage')"
          >
            <oc-icon fill-type="line" name="reset-left" />
          </oc-button>
        </div>
      </div>
      <oc-button
        v-if="showDeleteButton"
        v-oc-tooltip="resourceDeleteDescription"
        class="preview-controls-delete raw-hover-surface p-1"
        appearance="raw"
        :aria-label="resourceDeleteDescription"
        @click="$emit('deleteResource')"
      >
        <oc-icon fill-type="line" name="delete-bin" />
      </oc-button>
    </div>
  </div>
</template>
<script lang="ts">
import { computed, defineComponent, PropType } from 'vue'
import { useGettext } from 'vue3-gettext'
import { Resource } from '@opencloud-eu/web-client'
import { isMacOs } from '@opencloud-eu/web-pkg/src'

export default defineComponent({
  name: 'MediaControls',
  props: {
    files: {
      type: Array as PropType<Resource[]>,
      required: true
    },
    activeIndex: {
      type: Number,
      default: 0
    },
    isFullScreenModeActivated: {
      type: Boolean,
      default: false
    },
    isFolderLoading: {
      type: Boolean,
      default: false
    },
    showImageControls: {
      type: Boolean,
      default: false
    },
    showDeleteButton: {
      type: Boolean,
      default: true
    },
    currentImageZoom: {
      type: Number,
      default: 1
    },
    currentImageRotation: {
      type: Number,
      default: 0
    }
  },
  emits: [
    'setRotation',
    'setZoom',
    'toggleFullScreen',
    'toggleNext',
    'togglePrevious',
    'resetImage',
    'deleteResource'
  ],
  setup(props, { emit }) {
    const { $gettext } = useGettext()

    const currentZoomDisplayValue = computed(() => {
      return `${(props.currentImageZoom * 100).toFixed(0)}%`
    })

    const ariaHiddenFileCount = computed(() => {
      return $gettext('%{ displayIndex } of %{ availableMediaFiles }', {
        displayIndex: (props.activeIndex + 1).toString(),
        availableMediaFiles: props.files.length.toString()
      })
    })
    const screenreaderFileCount = computed(() => {
      return $gettext('Media file %{ displayIndex } of %{ availableMediaFiles }', {
        displayIndex: (props.activeIndex + 1).toString(),
        availableMediaFiles: props.files.length.toString()
      })
    })

    const calculateZoom = (zoom: number, factor: number) => {
      return Math.round(zoom * factor * 20) / 20
    }
    const imageShrink = () => {
      emit('setZoom', Math.max(0.1, calculateZoom(props.currentImageZoom, 0.8)))
    }
    const imageZoom = () => {
      const maxZoomValue = calculateZoom(9, 1.25)
      emit('setZoom', Math.min(calculateZoom(props.currentImageZoom, 1.25), maxZoomValue))
    }
    const imageRotateLeft = () => {
      emit('setRotation', props.currentImageRotation === -270 ? 0 : props.currentImageRotation - 90)
    }
    const imageRotateRight = () => {
      emit('setRotation', props.currentImageRotation === 270 ? 0 : props.currentImageRotation + 90)
    }

    const resourceDeleteDescription = computed(() => {
      return $gettext('Delete (%{key})', {
        key: isMacOs() ? $gettext('⌘ + Backspace') : $gettext('Del')
      })
    })

    return {
      currentZoomDisplayValue,
      screenreaderFileCount,
      ariaHiddenFileCount,
      resourceDeleteDescription,
      enterFullScreenDescription: $gettext('Enter full screen mode'),
      exitFullScreenDescription: $gettext('Exit full screen mode'),
      imageShrinkDescription: $gettext('Shrink the image'),
      imageZoomDescription: $gettext('Enlarge the image'),
      imageResetDescription: $gettext('Reset'),
      imageRotateLeftDescription: $gettext('Rotate the image 90 degrees to the left'),
      imageRotateRightDescription: $gettext('Rotate the image 90 degrees to the right'),
      previousDescription: $gettext('Show previous media file in folder'),
      nextDescription: $gettext('Show next media file in folder'),
      imageShrink,
      imageZoom,
      imageRotateLeft,
      imageRotateRight
    }
  }
})
</script>
