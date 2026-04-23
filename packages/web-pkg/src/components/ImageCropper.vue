<template>
  <div>
    <cropper-canvas ref="cropperCanvasRef" background :style="{ height: height }" wheelable>
      <cropper-image
        ref="cropperImageRef"
        :src="imageUrl"
        rotatable
        scalable
        skewable
        translatable
        wheelable
        @transform="onCropperImageTransform"
      />
      <cropper-shade hidden />
      <cropper-handle action="select" plain />
      <cropper-selection
        id="image-cropper-selection"
        ref="cropperSelectionRef"
        tabindex="0"
        data-custom-key-bindings-disabled="true"
        initial-coverage="0.8"
        :aspect-ratio="aspectRatio"
        movable
        resizable
        outlined
        :class="[
          'focus:!ring-0 focus:!outline outline-role-outline focus:!outline-role-outline',
          { 'rounded-full': roundedSelection }
        ]"
        @change="onCropperSelectionChange"
      >
        <cropper-grid role="grid" bordered covered />
        <cropper-crosshair centered />
        <cropper-handle action="move" theme-color="rgba(255, 255, 255, 0.35)" />
        <cropper-handle theme-color="#70787c" action="n-resize" />
        <cropper-handle theme-color="#70787c" action="e-resize" />
        <cropper-handle theme-color="#70787c" action="s-resize" />
        <cropper-handle theme-color="#70787c" action="w-resize" />
        <cropper-handle theme-color="#70787c" action="ne-resize" />
        <cropper-handle theme-color="#70787c" action="nw-resize" />
        <cropper-handle theme-color="#70787c" action="se-resize" />
        <cropper-handle theme-color="#70787c" action="sw-resize" />
      </cropper-selection>
    </cropper-canvas>
    <div class="text-sm text-role-on-surface-variant flex items-center mt-1">
      <oc-icon class="mr-1" name="information" size="small" fill-type="line" />
      <span
        v-text="
          $gettext('Zoom via %{ zoomKeys }, pan via %{ panKeys }', {
            zoomKeys: $gettext('+-'),
            panKeys: $gettext('↑↓←→')
          })
        "
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, unref, watch } from 'vue'
import { useCropperKeyboardActions } from '../composables'
import 'cropperjs'
import type {
  CropperSelection,
  CropperImage as CropperImageType,
  CropperCanvas as CropperCanvasType
} from 'cropperjs'
import { useGettext } from 'vue3-gettext'

interface Selection {
  x: number
  y: number
  width: number
  height: number
}

const {
  imageUrl,
  aspectRatio = 16 / 9,
  height = '400px',
  roundedSelection = false
} = defineProps<{
  imageUrl: string
  aspectRatio?: number
  height?: string
  roundedSelection?: boolean
}>()

const { $gettext } = useGettext()
const { setCropperInstance } = useCropperKeyboardActions()

const cropperCanvasRef = ref<CropperCanvasType | null>(null)
const cropperImageRef = ref<CropperImageType | null>(null)
const cropperSelectionRef = ref<CropperSelection | null>(null)

const inSelection = (selection: Selection, maxSelection: Selection) => {
  return (
    selection.x >= maxSelection.x &&
    selection.y >= maxSelection.y &&
    selection.x + selection.width <= maxSelection.x + maxSelection.width &&
    selection.y + selection.height <= maxSelection.y + maxSelection.height
  )
}

const onCropperImageTransform = (event: CustomEvent) => {
  const cropperCanvas = unref(cropperCanvasRef)
  if (!cropperCanvas) {
    return
  }

  const cropperSelection = unref(cropperSelectionRef)
  if (!cropperSelection) {
    return
  }

  const cropperCanvasRect = cropperCanvas.getBoundingClientRect()
  const selection = cropperSelection as Selection
  const maxSelection: Selection = {
    x: 0,
    y: 0,
    width: cropperCanvasRect.width,
    height: cropperCanvasRect.height
  }

  if (!inSelection(selection, maxSelection)) {
    event.preventDefault()
  }
}

const onCropperSelectionChange = (event: CustomEvent) => {
  const cropperCanvas = unref(cropperCanvasRef)
  if (!cropperCanvas) {
    return
  }

  const cropperCanvasRect = cropperCanvas.getBoundingClientRect()
  const selection = event.detail as Selection
  const maxSelection: Selection = {
    x: 0,
    y: 0,
    width: cropperCanvasRect.width,
    height: cropperCanvasRect.height
  }

  if (!inSelection(selection, maxSelection)) {
    event.preventDefault()
  }
}

const getCroppedCanvas = async (width?: number, height?: number) => {
  if (!unref(cropperSelectionRef)) {
    return null
  }
  return await unref(cropperSelectionRef).$toCanvas(
    width && height ? { width, height } : undefined
  )
}

watch(cropperSelectionRef, (cropper) => {
  if (cropper) {
    setCropperInstance(cropperSelectionRef, cropperImageRef)
  }
})

defineExpose({
  getCroppedCanvas
})
</script>
