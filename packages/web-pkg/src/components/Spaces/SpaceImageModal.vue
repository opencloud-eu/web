<template>
  <div v-if="imageUrl" class="space-image-modal-image-container">
    <img ref="imageRef" :src="imageUrl" />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, unref, useTemplateRef } from 'vue'
import {
  Modal,
  useClientService,
  useCreateSpace,
  useMessages,
  useSharesStore,
  useSpaceHelpers,
  useSpacesStore
} from '../../composables'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'
import { eventBus } from '../../services'
import { SpaceResource } from '@opencloud-eu/web-client'
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
const sharesStore = useSharesStore()
const { createDefaultMetaFolder } = useCreateSpace()
const { getDefaultMetaFolder } = useSpaceHelpers()

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

    const updatedSpace = await graphClient.drives.updateDrive(
      space.id,
      {
        name: space.name,
        special: [{ specialFolder: { name: 'image' }, id: fileId }]
      },
      sharesStore.graphRoles
    )

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
    spacesStore.removeFromImagesLoading(space.id)
    console.error(error)
    showErrorMessage({
      title: $gettext('Failed to set space image'),
      errors: [error]
    })
  }
}

const extractFirstFrameFromGif = (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      canvas.getContext('2d').drawImage(image, 0, 0)
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject()), 'image/png')
      URL.revokeObjectURL(image.src)
    }
    image.onerror = reject
    image.src = URL.createObjectURL(file)
  })
}

onMounted(async () => {
  try {
    const fileSource = file.type == 'image/gif' ? await extractFirstFrameFromGif(file) : file
    imageUrl.value = URL.createObjectURL(fileSource)

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
  } catch (error) {
    showErrorMessage({
      title: $gettext('Failed to load space image'),
      errors: [error]
    })
  }
})
</script>

<style lang="scss" scoped>
.space-image-modal {
  &-image-container {
    max-height: 400px;
  }
}
</style>
