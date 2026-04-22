import { computed } from 'vue'
import { useWindowSize } from '@vueuse/core'

const MOBILE_BREAKPOINT = 640
const TABLET_BREAKPOINT = 840

export const useIsMobile = ({ includeTablet = false } = {}) => {
  const { width } = useWindowSize()

  const isMobile = computed(() => {
    const breakpoint = includeTablet ? TABLET_BREAKPOINT : MOBILE_BREAKPOINT
    return width.value <= breakpoint
  })

  return {
    isMobile
  }
}
