import { Rendition } from 'epubjs'
import { useLocalStorage } from '@opencloud-eu/web-pkg'
import { computed, Ref, ref, unref, watch } from 'vue'

const DEFAULT_PERCENTAGE = 100
const MIN_PERCENTAGE = 50
const MAX_PERCENTAGE = 150
const STEP = 10

/** Font size of the book content in percent, persisted across books. */
export function useReaderFontSize(rendition: Ref<Rendition | undefined>) {
  const storage = useLocalStorage<{ fontSizePercentage?: number }>('oc_epubReader', {})
  const fontSizePercentage = ref(unref(storage).fontSizePercentage || DEFAULT_PERCENTAGE)

  const canIncrease = computed(() => unref(fontSizePercentage) < MAX_PERCENTAGE)
  const canDecrease = computed(() => unref(fontSizePercentage) > MIN_PERCENTAGE)

  function increase() {
    fontSizePercentage.value = Math.min(unref(fontSizePercentage) + STEP, MAX_PERCENTAGE)
  }

  function decrease() {
    fontSizePercentage.value = Math.max(unref(fontSizePercentage) - STEP, MIN_PERCENTAGE)
  }

  function reset() {
    fontSizePercentage.value = DEFAULT_PERCENTAGE
  }

  watch(
    [rendition, fontSizePercentage],
    ([currentRendition, percentage]) => {
      currentRendition?.themes.fontSize(`${percentage}%`)
    },
    { immediate: true }
  )

  watch(fontSizePercentage, (percentage) => {
    storage.value = { ...unref(storage), fontSizePercentage: percentage }
  })

  return { fontSizePercentage, step: STEP, canIncrease, canDecrease, increase, decrease, reset }
}
