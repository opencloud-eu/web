import { computed, unref } from 'vue'
import { useLocalStorage } from '@opencloud-eu/web-pkg'
import { APP_VIEW_MODES, AppViewMode } from '../types'

export function useAppViewMode() {
  const viewModeOption = useLocalStorage<string>('oc-options_app-store_view-mode')

  const viewMode = computed<AppViewMode>({
    get() {
      const mode = unref(viewModeOption) as AppViewMode
      return APP_VIEW_MODES.includes(mode) ? mode : 'tiles'
    },
    set(mode) {
      viewModeOption.value = mode
    }
  })

  return { viewMode }
}
