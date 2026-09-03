import { computed, unref } from 'vue'
import { activeApp, useRoute } from '../router'

export function useIsAppActive() {
  const currentRoute = useRoute()
  return computed(() => unref(currentRoute)?.query?.contextRouteName)
}

export function useIsFilesAppActive() {
  const currentRoute = useRoute()

  return computed(() => activeApp(unref(currentRoute)) === 'files')
}
