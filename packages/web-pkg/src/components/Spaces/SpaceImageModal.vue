<template>
  <cropper-canvas ref="cropperCanvasRef" background style="height: 400px" wheelable>
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
      id="space-image-modal-cropper-selection"
      ref="cropperSelectionRef"
      tabindex="0"
      data-custom-key-bindings-disabled="true"
      initial-coverage="0.8"
      :aspect-ratio="16 / 9"
      movable
      resizable
      outlined
      class="focus:!ring-0 focus:!outline outline-role-outline focus:!outline-role-outline"
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
</template>

<script setup lang="ts">
import { onMounted, ref, unref, watch } from 'vue'
import {
  Modal,
  useClientService,
  useCreateSpace,
  useMessages,
  useSpaceHelpers,
  useSpacesStore,
  useCropperKeyboardActions
} from '../../composables'
import 'cropperjs'
import { eventBus } from '../../services'
import { HttpError, SpaceResource } from '@opencloud-eu/web-client'
import { useGettext } from 'vue3-gettext'
import type {
  CropperSelection,
  CropperImage as CropperImageType,
  CropperCanvas as CropperCanvasType
} from 'cropperjs'

interface Selection {
  x: number
  y: number
  width: number
  height: number
}

const { space, file } = defineProps<{
  modal: Modal
  space: SpaceResource
  file: File
}>()

const { showMessage, showErrorMessage } = useMessages()
const { $gettext } = useGettext()
const clientService = useClientService()
const spacesStore = useSpacesStore()
const { createDefaultMetaFolder } = useCreateSpace()
const { getDefaultMetaFolder } = useSpaceHelpers()
const { setCropperInstance } = useCropperKeyboardActions()

const cropperCanvasRef = ref<CropperCanvasType | null>(null)
const cropperImageRef = ref<CropperImageType | null>(null)
const cropperSelectionRef = ref<CropperSelection | null>(null)
const imageUrl = ref<string | null>(null)

const onConfirm = async () => {
  if (!unref(cropperSelectionRef)) {
    return
  }

  const canvas = await unref(cropperSelectionRef).$toCanvas()
  const content = await getArrayBufferFromCropper(canvas)
  await uploadSpaceImage(content)
}

defineExpose({
  onConfirm
})

const getArrayBufferFromCropper = async (canvas: HTMLCanvasElement): Promise<ArrayBuffer> => {
  const blob = (await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png')
  )) as Blob
  return blob.arrayBuffer()
}

const uploadSpaceImage = async (content: ArrayBuffer) => {
  const graphClient = clientService.graphAuthenticated
  spacesStore.addToImagesLoading(space.id)

  let metaFolder = await getDefaultMetaFolder(space)
  if (!metaFolder) {
    metaFolder = await createDefaultMetaFolder(space)
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/offset+octet-stream'
  }

  try {
    const { fileId, processing } = await clientService.webdav.putFileContents(space, {
      parentFolderId: metaFolder.id,
      fileName: 'image.png',
      content,
      headers,
      overwrite: true
    })

    const updatedSpace = await graphClient.drives.updateDrive(space.id, {
      name: space.name,
      special: [{ specialFolder: { name: 'image' }, id: fileId }]
    })

    if (!processing) {
      spacesStore.removeFromImagesLoading(space.id)
    }

    spacesStore.updateSpaceField({
      id: space.id,
      field: 'spaceImageData',
      value: updatedSpace.spaceImageData
    })

    showMessage({ title: $gettext('Space image was set successfully') })
    eventBus.publish('app.files.spaces.uploaded-image', updatedSpace)
  } catch (error) {
    console.error(error)
    spacesStore.removeFromImagesLoading(space.id)

    if (error instanceof HttpError && error.statusCode === 507) {
      showErrorMessage({
        title: $gettext('Failed to set space image'),
        desc: $gettext('Not enough quota to set the space image'),
        errors: [error]
      })
      return
    }

    showErrorMessage({
      title: $gettext('Failed to set space image'),
      errors: [error]
    })
  }
}

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

watch(cropperSelectionRef, (cropper) => {
  if (cropper) {
    setCropperInstance(cropperSelectionRef, cropperImageRef)
  }
})

onMounted(() => {
  try {
    imageUrl.value = URL.createObjectURL(file)
  } catch (error) {
    showErrorMessage({
      title: $gettext('Failed to load space image'),
      errors: [error]
    })
  }
})
</script>
