import { computed, unref } from 'vue'
import { useRoute } from '../../router'

export const useIsAppActive = () => {
  const currentRoute = useRoute()
  return computed(() => unref(currentRoute)?.query?.contextRouteName)
}
