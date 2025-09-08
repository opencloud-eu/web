import { ref, unref } from 'vue'

// sizes in pixels
const BASE_SIZE = 140
const STEP_SIZE = 84

export const useTileSize = () => {
  const baseSizePixels = ref(BASE_SIZE)
  const stepSizePixels = ref(STEP_SIZE)

  const calculateTileSizePixels = (viewSize: number) => {
    return unref(baseSizePixels) + (viewSize - 1) * unref(stepSizePixels)
  }
  const calculateTileSizeRem = (viewSize: number) => {
    const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize)
    return calculateTileSizePixels(viewSize) / fontSize
  }

  return {
    calculateTileSizePixels,
    calculateTileSizeRem
  }
}
