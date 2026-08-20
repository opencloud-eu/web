import { computed } from 'vue'
import { until } from '@vueuse/core'
import { useSpacesStore } from '../piniaStores'

export const useSpacesLoading = () => {
  const spacesStore = useSpacesStore()
  const areSpacesLoading = computed(
    () => !spacesStore.spacesInitialized || spacesStore.spacesLoading
  )

  async function waitForSpaces(): Promise<void> {
    await until(areSpacesLoading).toBe(false)
  }

  return {
    areSpacesLoading,
    waitForSpaces
  }
}
