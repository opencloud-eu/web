import { computed } from 'vue'
import {
  isLocationCommonActive,
  isLocationSharesActive,
  isLocationTrashActive,
  useRouter
} from '@opencloud-eu/web-pkg'

/**
 * Returns the illustration of the currently active files view.
 */
export function useViewIllustration() {
  const router = useRouter()

  function getImageName() {
    if (isLocationCommonActive(router, 'files-common-favorites')) {
      return 'favorites'
    }
    if (isLocationCommonActive(router, 'files-common-search')) {
      return 'search-results'
    }
    if (isLocationSharesActive(router, 'files-shares-with-me')) {
      return 'shared-with-me'
    }
    if (isLocationSharesActive(router, 'files-shares-with-others')) {
      return 'shared-with-others'
    }
    if (isLocationSharesActive(router, 'files-shares-via-link')) {
      return 'shared-via-link'
    }
    if (isLocationTrashActive(router, 'files-trash-generic')) {
      return 'trash'
    }
    return 'folder'
  }

  const illustration = computed(() => `images/illustrations/${getImageName()}.svg`)

  return { illustration }
}
