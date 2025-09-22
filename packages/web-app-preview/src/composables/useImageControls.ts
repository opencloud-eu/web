import { ref } from 'vue'
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

  return {
    currentImageZoom,
    currentImageRotation,
    resetImage
  }
}
