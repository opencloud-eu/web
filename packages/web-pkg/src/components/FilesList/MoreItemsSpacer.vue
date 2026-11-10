<template>
  <!-- nothing to load anymore, the complete list is rendered -->
  <div v-if="!allLoaded" class="w-full">
    <!--
      Fallback for environments without IntersectionObserver support (e.g. embeds without
      the polyfill): a manual button instead of the invisible scroll sentinel.
    -->
    <oc-button
      v-if="!isIntersectionObserverSupported"
      data-testid="files-show-more"
      appearance="raw"
      class="w-full text-center"
      @click="emit('loadMore')"
    >
      {{ $gettext('Show more') }}
    </oc-button>
    <div v-else ref="sentinel" class="h-px w-full" data-testid="files-infinite-scroll-sentinel" />
  </div>
</template>

<script setup lang="ts">
import { ref, unref, Ref, watch } from 'vue'
import { useGettext } from 'vue3-gettext'
import { useIsVisible } from '@opencloud-eu/design-system/composables'
import { PaginationConstants, useFilesViewScrollContainer } from '../../composables'

export interface Props {
  /**
   * Whether the complete list is rendered already, hiding the sentinel.
   */
  allLoaded?: boolean
  /**
   * How far below the fold the sentinel is deemed visible, so that the next chunk
   * is appended before the user reaches the end of the list.
   * Percentages resolve against the scroll container.
   * @default '100% 0%'
   */
  rootMargin?: string
}

export interface Emits {
  (e: 'loadMore'): void
}

const { allLoaded = false, rootMargin = undefined } = defineProps<Props>()
const emit = defineEmits<Emits>()

const { $gettext } = useGettext()

const isIntersectionObserverSupported = typeof window?.IntersectionObserver === 'function'

const scrollContainer = useFilesViewScrollContainer()
const sentinel = ref<Element>()
const consecutiveLoads = ref(0)

/**
 * The sentinel can still sit inside the look-ahead zone right after an append
 * (e.g. short items in a high viewport). Cap consecutive appends and wait for the
 * user scrolling, so that the sentinel leaves and re-enters the look-ahead zone.
 */
const onVisible = () => {
  if (unref(consecutiveLoads) >= PaginationConstants.infiniteScrollAppendCap) {
    return
  }
  emit('loadMore')
  consecutiveLoads.value++
}
const onHidden = () => {
  consecutiveLoads.value = 0
}
/**
 * The sentinel unmounts once everything is rendered and remounts when the list
 * grows again (e.g. after resources were deleted). The observation then starts
 * from scratch.
 */
watch(
  () => allLoaded,
  (isLoaded) => {
    if (!isLoaded) {
      consecutiveLoads.value = 0
    }
  }
)

useIsVisible({
  target: sentinel as Ref<Element>,
  root: scrollContainer,
  mode: 'showHide',
  rootMargin,
  onVisibleCallback: onVisible,
  onHiddenCallback: onHidden
})
</script>
