import { defineStore } from 'pinia'
import { ref } from 'vue'
import { SpaceResource } from '@opencloud-eu/web-client'

/**
 * Selection of the admin settings spaces list. The spaces themselves live in the
 * `allProjectSpaces` of the spaces store in web-pkg.
 */
export const useSpaceSettingsStore = defineStore('spaceSettings', () => {
  const selectedSpaces = ref<SpaceResource[]>([])

  function setSelectedSpaces(data: SpaceResource[]) {
    selectedSpaces.value = data
  }

  function addSelectedSpace(data: SpaceResource) {
    selectedSpaces.value.push(data)
  }

  function reset() {
    selectedSpaces.value = []
  }

  return {
    selectedSpaces,
    addSelectedSpace,
    setSelectedSpaces,
    reset
  }
})

export type SpaceSettingsStore = ReturnType<typeof useSpaceSettingsStore>
