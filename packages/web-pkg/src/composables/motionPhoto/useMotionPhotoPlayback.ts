import { computed, MaybeRefOrGetter, ref, toValue, unref, watch } from 'vue'
import { tryOnScopeDispose, useMediaQuery } from '@vueuse/core'
import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { useMotionPhoto } from './useMotionPhoto'

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
  const { canPlay: canPlayResource, loadVideoUrl, getStillTimestampSeconds } = useMotionPhoto()

  const isPlaying = ref(false)
  const isLoading = ref(false)
  const videoUrl = ref<string>()
  let controller: AbortController = null
  let spinnerTimer: ReturnType<typeof setTimeout>
  // guard against a second play() while a load is already in flight (e.g. a
  // badge click during a hover load) so we never fire a second request or lose
  // the controller reference (which would leave the first request uncancelable)
  let inFlight = false

  const canPlay = computed(() => canPlayResource(toValue(resource)))

  const play = async (): Promise<void> => {
    if (unref(isPlaying) || inFlight) {
      return
    }
    const currentSpace = toValue(space)
    const currentResource = toValue(resource)
    if (!currentSpace || !canPlayResource(currentResource)) {
      return
    }

    inFlight = true
    controller = new AbortController()
    const { signal } = controller
    // reveal a spinner only if fetching takes a moment (instant on SSD/localhost)
    spinnerTimer = setTimeout(() => {
      if (!signal.aborted) {
        isLoading.value = true
      }
    }, 200)
    try {
      const url = await loadVideoUrl(currentSpace, currentResource, signal)
      if (signal.aborted) {
        return
      }
      videoUrl.value = url
      isPlaying.value = true
    } catch {
      // aborted or the fetch failed: nothing to play
    } finally {
      inFlight = false
      clearTimeout(spinnerTimer)
      isLoading.value = false
    }
  }

  const stop = (): void => {
    controller?.abort()
    inFlight = false
    clearTimeout(spinnerTimer)
    isLoading.value = false
    isPlaying.value = false
  }

  const toggle = (): void => {
    unref(isPlaying) ? stop() : play()
  }

  // hover-to-play only on hover-capable (non-touch) devices, so a tap on the
  // resource opens it instead of accidentally starting playback. On touch the
  // badge tap (toggle) drives play/pause.
  const canHover = useMediaQuery('(hover: hover)')
  const hoverPlay = (): void => {
    if (unref(canHover)) {
      play()
    }
  }

  // seek to the frame matching the still so the still -> motion transition is seamless
  const seekToStill = (event: Event): void => {
    const timestamp = getStillTimestampSeconds(toValue(resource))
    if (timestamp !== null) {
      ;(event.target as HTMLVideoElement).currentTime = timestamp
    }
  }

  // reset playback when the resource changes (e.g. sidebar switches selection)
  watch(
    () => toValue(resource)?.id,
    () => stop()
  )
  tryOnScopeDispose(stop)

  return { isPlaying, isLoading, videoUrl, canPlay, play, stop, toggle, hoverPlay, seekToStill }
}
