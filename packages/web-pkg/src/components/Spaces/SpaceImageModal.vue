<template>
  <image-cropper ref="imageCropperRef" :image-url="imageUrl" :aspect-ratio="16 / 9" />
</template>

<script setup lang="ts">
import { onMounted, ref, unref } from 'vue'
import {
  Modal,
  useClientService,
  useCreateSpace,
  useMessages,
  useSpaceHelpers,
  useSpacesStore
} from '../../composables'
import { eventBus } from '../../services'
import { HttpError, SpaceResource } from '@opencloud-eu/web-client'
import { useGettext } from 'vue3-gettext'
import ImageCropper from '../ImageCropper.vue'

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

const imageCropperRef = ref<InstanceType<typeof ImageCropper> | null>(null)
const imageUrl = ref<string | null>(null)

const onConfirm = async () => {
  if (!unref(imageCropperRef)) {
    return
  }

  const canvas = await unref(imageCropperRef).getCroppedCanvas()
  if (!canvas) {
    return
  }
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
