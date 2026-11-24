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
    <div
      v-else
      :key="recheckKey"
      ref="sentinel"
      class="h-px w-full"
      data-testid="files-infinite-scroll-sentinel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, Ref } from 'vue'
import { useGettext } from 'vue3-gettext'
import { useIsVisible } from '@opencloud-eu/design-system/composables'
import { useFilesViewScrollContainer } from '../../composables'

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
  /**
   * Change this whenever the rendered items change. It replaces the sentinel so
   * that it is observed again even when it stayed inside the look-ahead zone
   * during the append.
   */
  recheckKey?: PropertyKey
}

export interface Emits {
  (e: 'loadMore'): void
}

const { allLoaded = false, rootMargin = undefined, recheckKey = undefined } = defineProps<Props>()
const emit = defineEmits<Emits>()

const { $gettext } = useGettext()

const isIntersectionObserverSupported = typeof window?.IntersectionObserver === 'function'

const scrollContainer = useFilesViewScrollContainer()
const sentinel = ref<Element>()

function onVisible() {
  emit('loadMore')
}

/**
 * A fresh sentinel is mounted after every append. IntersectionObserver only
 * reports intersection changes, so re-observing is necessary when the previous
 * sentinel never left the look-ahead zone.
 */
useIsVisible({
  target: sentinel as Ref<Element>,
  root: scrollContainer,
  mode: 'show',
  rootMargin,
  onVisibleCallback: onVisible
})
</script>
