import { computed, MaybeRefOrGetter, ref, toValue, unref, watch } from 'vue'
import { tryOnScopeDispose, useMediaQuery } from '@vueuse/core'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useMotionPhoto } from './useMotionPhoto'

export const HOVER_INTENT_DELAY_MS = 150

export function useMotionPhotoPlayback(
  resource: MaybeRefOrGetter<Resource>,
  space: MaybeRefOrGetter<SpaceResource>
) {
  const {
    canPlay: canPlayResource,
    loadVideoUrl,
    getStillTimestampSeconds,
    revoke
  } = useMotionPhoto()

  const isPlaying = ref(false)
  const isLoading = ref(false)
  const videoUrl = ref<string>()
  let controller: AbortController = null
  let spinnerTimer: ReturnType<typeof setTimeout>
  let hoverTimer: ReturnType<typeof setTimeout>
  // a run cancelled mid-fetch still reaches its finally block; the generation
  // keeps it from resetting the state of the run that replaced it
  let generation = 0

  const canPlay = computed(() => canPlayResource(toValue(resource)))

  const play = async (): Promise<void> => {
    if (unref(isPlaying) || controller) {
      return
    }
    const currentSpace = toValue(space)
    const currentResource = toValue(resource)
    if (!currentSpace || !canPlayResource(currentResource)) {
      return
    }

    const runGeneration = ++generation
    const runController = new AbortController()
    controller = runController
    const { signal } = runController
    spinnerTimer = setTimeout(() => {
      if (!signal.aborted) {
        isLoading.value = true
      }
    }, 200)
    try {
      const url = await loadVideoUrl(currentSpace, currentResource, signal)
      if (signal.aborted || runGeneration !== generation) {
        return
      }
      videoUrl.value = url
      isPlaying.value = true
    } catch {
      // aborted, or nothing to play
    } finally {
      if (runGeneration === generation) {
        controller = null
        clearTimeout(spinnerTimer)
        isLoading.value = false
      }
    }
  }

  const stop = (): void => {
    generation++
    clearTimeout(hoverTimer)
    controller?.abort()
    controller = null
    clearTimeout(spinnerTimer)
    isLoading.value = false
    isPlaying.value = false
  }

  const toggle = (): void => {
    clearTimeout(hoverTimer)
    unref(isPlaying) ? stop() : play()
  }

  // on touch devices a tap must open the resource, not start playback
  const canHover = useMediaQuery('(hover: hover)')
  // sweeping the pointer across a list must not fire a range request per item
  const hoverPlay = (): void => {
    if (!unref(canHover)) {
      return
    }
    clearTimeout(hoverTimer)
    hoverTimer = setTimeout(play, HOVER_INTENT_DELAY_MS)
  }

  const seekToStill = (event: Event): void => {
    const timestamp = getStillTimestampSeconds(toValue(resource))
    if (timestamp !== null) {
      ;(event.target as HTMLVideoElement).currentTime = timestamp
    }
  }

  watch(
    () => toValue(resource)?.id,
    (_, previousId) => {
      stop()
      if (previousId) {
        videoUrl.value = undefined
        revoke(previousId)
      }
    }
  )
  tryOnScopeDispose(stop)

  return { isPlaying, isLoading, videoUrl, canPlay, play, stop, toggle, hoverPlay, seekToStill }
}
