import { MaybeRef, onBeforeUnmount, onMounted, ref, unref } from 'vue'

/**
 * Toggles browser fullscreen for the given element (the whole document by default) and
 * mirrors the browser's fullscreen state, so leaving fullscreen via Esc is reflected as well.
 */
export function useFullScreenMode(target?: MaybeRef<HTMLElement | undefined>) {
  const isFullScreenModeActivated = ref(false)

  function getTargetElement() {
    return unref(target) || document.documentElement
  }

  function syncFullScreenState() {
    isFullScreenModeActivated.value = document.fullscreenElement === getTargetElement()
  }

  async function toggleFullScreenMode() {
    if (document.fullscreenElement) {
      await document.exitFullscreen?.()
      return
    }

    await getTargetElement().requestFullscreen?.()
  }

  onMounted(() => {
    document.addEventListener('fullscreenchange', syncFullScreenState)
  })
  onBeforeUnmount(() => {
    document.removeEventListener('fullscreenchange', syncFullScreenState)
  })

  return {
    isFullScreenModeActivated,
    toggleFullScreenMode
  }
}
