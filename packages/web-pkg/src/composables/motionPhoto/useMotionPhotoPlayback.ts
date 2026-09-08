import { computed, MaybeRefOrGetter, ref, toValue, unref, watch } from 'vue'
import { tryOnScopeDispose, useMediaQuery } from '@vueuse/core'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useMotionPhoto } from './useMotionPhoto'

export const HOVER_INTENT_DELAY_MS = 150

/**
 * Full inline-playback state for a single motion photo, shared by every surface
 * that plays a clip (grid tile, sidebar preview, media viewer). It owns the
 * fetch (via useMotionPhoto), the playing/loading flags, the delayed buffer
 * indicator, abort-on-leave and the still-frame seek, so consumers only wire the
 * returned state and handlers to their template.
 */
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
  // Every play() run gets its own generation. stop() bumps it, so a run that was
  // cancelled while its fetch was in flight can tell (in its finally block) that
  // it is stale and must not touch the state of a newer run: otherwise it would
  // clear the newer run's spinner timer, reset its loading flag and drop the
  // in-flight guard, leaving that newer run uncancelable.
  let generation = 0

  const canPlay = computed(() => canPlayResource(toValue(resource)))

  const play = async (): Promise<void> => {
    if (unref(isPlaying) || controller) {
      // already playing, or a load is in flight (e.g. a badge click during a
      // hover load): never fire a second request or lose the controller
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
    // reveal a spinner only if fetching takes a moment (instant on SSD/localhost)
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
      // aborted or the fetch failed: nothing to play
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

  // hover-to-play only on hover-capable (non-touch) devices, so a tap on the
  // resource opens it instead of accidentally starting playback. On touch the
  // badge tap (toggle) drives play/pause.
  const canHover = useMediaQuery('(hover: hover)')
  // A short hover intent delay: sweeping the pointer across a list must not
  // fire (and abort) one range request per item. Kept short so a deliberate
  // hover still feels instant.
  const hoverPlay = (): void => {
    if (!unref(canHover)) {
      return
    }
    clearTimeout(hoverTimer)
    hoverTimer = setTimeout(play, HOVER_INTENT_DELAY_MS)
  }

  // seek to the frame matching the still so the still -> motion transition is seamless
  const seekToStill = (event: Event): void => {
    const timestamp = getStillTimestampSeconds(toValue(resource))
    if (timestamp !== null) {
      ;(event.target as HTMLVideoElement).currentTime = timestamp
    }
  }

  // reset playback when the resource changes (e.g. sidebar switches selection)
  // and let go of the previous clip: a long-lived consumer must not keep one
  // blob per resource it ever showed
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
