import { ref, unref } from 'vue'
import { useEventBus } from '@opencloud-eu/web-pkg'

export const useImageControls = () => {
  const eventBus = useEventBus()
  const currentImageZoom = ref(1)
  const currentImageRotation = ref(0)

  const resetImage = () => {
    currentImageZoom.value = 1
    currentImageRotation.value = 0
    eventBus.publish('app.preview.media.image.reset')
  }

  const calculateZoom = (zoom: number, factor: number) => {
    return Math.round(zoom * factor * 20) / 20
  }
  const imageShrink = () => {
    currentImageZoom.value = Math.max(0.1, calculateZoom(unref(currentImageZoom), 0.8))
  }
  const imageZoom = () => {
    const maxZoomValue = calculateZoom(9, 1.25)
    currentImageZoom.value = Math.min(calculateZoom(unref(currentImageZoom), 1.25), maxZoomValue)
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
    currentImageZoom,
    currentImageRotation,
    imageShrink,
    imageZoom,
    imageRotateLeft,
    imageRotateRight,
    resetImage
  }
}
