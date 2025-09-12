<template>
  <div
    :class="[
      '[&_.cropper-crop-box]:!outline-1',
      '[&_.cropper-crop-box]:!outline-role-outline',
      '[&_.cropper-line]:!bg-role-outline',
      '[&_.cropper-point]:!bg-role-outline'
    ]"
  >
    <div v-if="imageUrl" class="max-h-[400px]">
      <img ref="imageRef" :src="imageUrl" />
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
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, unref, useTemplateRef } from 'vue'
import {
  Modal,
  useClientService,
  useCreateSpace,
  useCropperKeyboardActions,
  useMessages,
  useSpaceHelpers,
  useSpacesStore
} from '../../composables'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'
import { eventBus } from '../../services'
import { HttpError, SpaceResource } from '@opencloud-eu/web-client'
import { useGettext } from 'vue3-gettext'

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

const cropper = ref<Cropper | null>(null)
const imageRef = useTemplateRef<HTMLImageElement>('imageRef')
const imageUrl = ref<string | null>(null)

const onConfirm = async () => {
  const canvas = unref(cropper)?.getCroppedCanvas({
    imageSmoothingQuality: 'high'
  })

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

onMounted(async () => {
  try {
    imageUrl.value = URL.createObjectURL(file)

    if (unref(cropper)) {
      unref(cropper)?.destroy()
    }

    await nextTick()

    cropper.value = new Cropper(unref(imageRef), {
      aspectRatio: 16 / 9,
      viewMode: 1,
      dragMode: 'move',
      autoCropArea: 0.8,
      responsive: true,
      background: false
    })
    setCropperInstance(cropper)
  } catch (error) {
    showErrorMessage({
      title: $gettext('Failed to load space image'),
      errors: [error]
    })
  }
})
</script>
