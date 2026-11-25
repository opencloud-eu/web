<template>
  <image-cropper
    v-if="imageUrl"
    ref="imageCropperRef"
    :image-url="imageUrl"
    :aspect-ratio="16 / 9"
  />
</template>

<script setup lang="ts">
import { ref, unref } from 'vue'
import { useObjectUrl } from '@vueuse/core'
import { ImageCropper } from '@opencloud-eu/web-pkg'
import type { Modal } from '@opencloud-eu/web-pkg'

/**
 * Crops an image to 16:9 and hands the result to `save`. What happens to it -
 * uploaded to a space, kept for one that doesn't exist yet - is up to the
 * caller. `save` is awaited, so the modal keeps its loading state.
 */
const { file, save } = defineProps<{
  modal: Modal
  file: File
  save: (content: ArrayBuffer) => Promise<void> | void
}>()

const imageCropperRef = ref<InstanceType<typeof ImageCropper> | null>(null)
const imageUrl = useObjectUrl(() => file)

async function onConfirm() {
  const content = await unref(imageCropperRef)?.getCroppedArrayBuffer()
  if (!content) {
    return
  }

  await save(content)
}

defineExpose({
  onConfirm
})
</script>
