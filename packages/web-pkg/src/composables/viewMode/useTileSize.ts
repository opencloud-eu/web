import { computed, readonly, ref, unref } from 'vue'

// sizes in pixels
const BASE_SIZE = 140
const STEP_SIZE = 84

// tile previews are snapped up to this step to keep the amount of distinct
// requests (and hence cache misses) low while resizing
const PREVIEW_SIZE_STEP = 64
const PREVIEW_PIXEL_RATIO_MAX = 1.5
const PREVIEW_SIZE_MAX = 768
const PREVIEW_SIZE_MIN = 320

const renderedTileSizePixels = ref<number>(0)

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

  const setRenderedTileSize = (pixels: number) => {
    renderedTileSizePixels.value = pixels
  }

  /**
   * Preview dimensions for tiles, derived from the rendered tile size and the device pixel ratio.
   * Falls back to the maximum as long as no tile has been rendered.
   */
  const previewDimensions = computed<[number, number]>(() => {
    const cssPixels = unref(renderedTileSizePixels)
    if (!cssPixels) {
      return [PREVIEW_SIZE_MAX, PREVIEW_SIZE_MAX]
    }

    // capped because serving the full ratio on high density displays costs a lot of
    // bandwidth for a barely visible gain
    const pixelRatio = Math.min(window.devicePixelRatio || 1, PREVIEW_PIXEL_RATIO_MAX)
    const devicePixels = cssPixels * pixelRatio
    const size = Math.min(
      Math.max(Math.ceil(devicePixels / PREVIEW_SIZE_STEP) * PREVIEW_SIZE_STEP, PREVIEW_SIZE_MIN),
      PREVIEW_SIZE_MAX
    )
    return [size, size]
  })

  return {
    calculateTileSizePixels,
    calculateTileSizeRem,
    renderedTileSizePixels: readonly(renderedTileSizePixels),
    setRenderedTileSize,
    previewDimensions
  }
}
