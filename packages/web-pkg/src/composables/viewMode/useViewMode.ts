import { ref, Ref, unref } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { useIsMobile } from '@opencloud-eu/design-system/composables'
import { FolderViewModeConstants } from './constants'

export function useViewMode(): Ref<string> {
  return useLocalStorage<string>('oc-options_view-mode', FolderViewModeConstants.defaultModeName, {
    writeDefaults: false
  })
}

export function useViewSize(): Ref<number> {
  // on phones the default tile size results in one huge tile per row, so default to the smallest size
  const { isMobile } = useIsMobile()
  return useLocalStorage<number>(
    'oc-options_tiles-size',
    unref(isMobile) ? 1 : FolderViewModeConstants.tilesSizeDefault,
    { writeDefaults: false }
  )
}

// doesn't need to be persisted anywhere. Gets re-calculated when the ResourceTiles component gets mounted.
const viewSizeMax = ref<number>(FolderViewModeConstants.tilesSizeMax)
export function useViewSizeMax(): Ref<number> {
  return viewSizeMax
}
