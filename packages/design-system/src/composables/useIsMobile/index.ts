import { computed } from 'vue'
import { useWindowSize } from '@vueuse/core'

export const useIsMobile = () => {
  const { width } = useWindowSize()

  const isMobile = computed(() => width.value < 768)

  return {
    isMobile
  }
}
