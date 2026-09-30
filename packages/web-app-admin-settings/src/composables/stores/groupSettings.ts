import { defineStore } from 'pinia'
import { ref, unref } from 'vue'
import { Group } from '@opencloud-eu/web-client/graph/generated'

export const useGroupSettingsStore = defineStore('groupSettings', () => {
  const groups = ref<Group[]>([])
  const selectedGroups = ref<Group[]>([])

  function setGroups(data: Group[]) {
    groups.value = data
  }

  function upsertGroup(group: Group) {
    const existing = unref(groups).find(({ id }) => id === group.id)
    if (existing) {
      Object.assign(existing, group)
      return
    }
    groups.value.push(group)
  }

  function removeGroups(values: Group[]) {
    groups.value = unref(groups).filter((group) => !values.find(({ id }) => id === group.id))
  }

  function setSelectedGroups(data: Group[]) {
    selectedGroups.value = data
  }

  function addSelectedGroup(data: Group) {
    selectedGroups.value.push(data)
  }

  function reset() {
    groups.value = []
    selectedGroups.value = []
  }

  return {
    groups,
    upsertGroup,
    setGroups,
    removeGroups,
    reset,
    selectedGroups,
    addSelectedGroup,
    setSelectedGroups
  }
})

export type GroupSettingsStore = ReturnType<typeof useGroupSettingsStore>
