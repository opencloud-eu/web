import { ref, unref } from 'vue'
import { useEventBus } from '@opencloud-eu/web-pkg'

export const useImageControls = () => {
  const eventBus = useEventBus()
  const currentImageRotation = ref(0)

  const resetImage = () => {
    currentImageRotation.value = 0
    eventBus.publish('app.preview.media.image.reset')
  }

  const imageShrink = () => {
    eventBus.publish('app.preview.media.image.shrink')
  }
  const imageZoom = () => {
    eventBus.publish('app.preview.media.image.zoom')
  }
  const imageRotateLeft = () => {
    currentImageRotation.value =
      unref(currentImageRotation) === -270 ? 0 : unref(currentImageRotation) - 90
  }
  const imageRotateRight = () => {
    currentImageRotation.value =
      unref(currentImageRotation) === 270 ? 0 : unref(currentImageRotation) + 90
  }

  return {
    currentImageRotation,
    imageShrink,
    imageZoom,
    imageRotateLeft,
    imageRotateRight,
    resetImage
  }
}
