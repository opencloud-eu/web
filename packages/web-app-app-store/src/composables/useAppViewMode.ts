import { computed, unref } from 'vue'
import { queryItemAsString, useRouteQueryPersisted } from '@opencloud-eu/web-pkg'
import { APPID } from '../appid'
import { APP_VIEW_MODES, AppViewMode } from '../types'

export function useAppViewMode() {
  const viewModeQuery = useRouteQueryPersisted({
    name: 'view-mode',
    defaultValue: 'tiles',
    storagePrefix: APPID
  })

  const viewMode = computed<AppViewMode>({
    get() {
      const mode = queryItemAsString(unref(viewModeQuery)) as AppViewMode
      return APP_VIEW_MODES.includes(mode) ? mode : 'tiles'
    },
    set(mode) {
      viewModeQuery.value = mode
    }
  })

  return { viewMode }
}
