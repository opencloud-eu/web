import { computed } from 'vue'

/** @deprecated */
export const useIsSearchActive = () =>
  computed(() => !!document.getElementById('files-global-search-options'))
