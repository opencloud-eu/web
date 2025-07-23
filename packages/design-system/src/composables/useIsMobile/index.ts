import { computed } from 'vue'
import { useWindowSize } from '@vueuse/core'

export const useIsMobile = () => {
  const { width } = useWindowSize()

  const isMobile = computed(() => {
    return width.value < 640
  })

  return {
    isMobile
  }
}
