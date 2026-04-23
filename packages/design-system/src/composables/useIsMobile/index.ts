import { computed } from 'vue'
import { useWindowSize } from '@vueuse/core'

const MOBILE_BREAKPOINT = 640
const TABLET_BREAKPOINT = 960

export const useIsMobile = () => {
  const { width } = useWindowSize()

  const isMobile = computed(() => {
    return width.value < MOBILE_BREAKPOINT
  })

  const isTablet = computed(() => {
    return width.value <= TABLET_BREAKPOINT
  })

  return {
    isMobile,
    isTablet
  }
}
