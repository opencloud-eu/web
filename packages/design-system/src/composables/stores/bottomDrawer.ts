import { defineStore } from 'pinia'
import { computed, ref, unref } from 'vue'
import { uniqueId } from '../../helpers'

export interface BottomDrawer {
  id: string
}

export const useBottomDrawer = defineStore('bottomDrawers', () => {
  const drawers = ref<BottomDrawer[]>([])

  const currentDrawer = computed(() => {
    // drawer that is currently displaying (top most)
    return unref(drawers).length ? unref(drawers)[unref(drawers).length - 1] : null
  })

  const showDrawer = () => {
    const drawer = { id: uniqueId() }
    drawers.value.push(drawer)
    return drawer
  }

  const closeDrawer = (id: string) => {
    drawers.value = unref(drawers).filter((d) => d.id !== id)
  }

  const closeAllDrawers = () => {
    drawers.value = []
  }

  return {
    drawers,
    currentDrawer,
    showDrawer,
    closeDrawer,
    closeAllDrawers
  }
})

export type BottomDrawerStore = ReturnType<typeof useBottomDrawer>
