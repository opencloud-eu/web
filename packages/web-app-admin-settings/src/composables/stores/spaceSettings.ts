import { defineStore } from 'pinia'
import { ref, unref } from 'vue'
import { SpaceResource } from '@opencloud-eu/web-client'
import { markSpaceVaultStatus, useExtensionRegistry } from '@opencloud-eu/web-pkg'

export const useSpaceSettingsStore = defineStore('spaceSettings', () => {
  const extensionRegistry = useExtensionRegistry()

  const spaces = ref<SpaceResource[]>([])
  const selectedSpaces = ref<SpaceResource[]>([])

  function setSpaces(data: SpaceResource[]) {
    markSpaceVaultStatus(extensionRegistry, data)
    spaces.value = data
  }

  function upsertSpace(space: SpaceResource) {
    const existing = unref(spaces).find(({ id }) => id === space.id)
    if (existing) {
      Object.assign(existing, space)
      markSpaceVaultStatus(extensionRegistry, [existing])
      return
    }
    markSpaceVaultStatus(extensionRegistry, [space])
    spaces.value.push(space)
  }

  function removeSpaces(values: SpaceResource[]) {
    spaces.value = unref(spaces).filter((space) => !values.find(({ id }) => id === space.id))
  }

  function setSelectedSpaces(data: SpaceResource[]) {
    selectedSpaces.value = data
  }

  function addSelectedSpace(data: SpaceResource) {
    selectedSpaces.value.push(data)
  }

  function reset() {
    spaces.value = []
    selectedSpaces.value = []
  }

  return {
    spaces,
    setSpaces,
    upsertSpace,
    removeSpaces,
    reset,
    selectedSpaces,
    addSelectedSpace,
    setSelectedSpaces
  }
})

export type SpaceSettingsStore = ReturnType<typeof useSpaceSettingsStore>
