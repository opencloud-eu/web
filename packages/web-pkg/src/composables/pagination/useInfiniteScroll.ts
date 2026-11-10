import {
  ComputedRef,
  MaybeRef,
  Ref,
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  unref,
  watch
} from 'vue'
import { findIndex } from 'lodash-es'
import { Item } from '@opencloud-eu/web-client'
import { eventBus } from '../../services'
import { PaginationConstants } from './constants'

const NAVIGATE_PAGE_EVENT = 'app.files.navigate.page'
const SCROLL_TO_EVENT = 'app.files.navigate.scrollTo'

interface NavigatePageEventPayload {
  resourceId: string
  forceScroll: boolean
  topbarElement: string
}

export interface InfiniteScrollOptions<T> {
  /**
   * The complete (e.g. sorted or filtered) list of items. The composable renders a
   * growing cumulative slice of it and never mutates the list itself.
   */
  items: MaybeRef<Array<T>>
  /**
   * Gates the `app.files.navigate.page` subscription, e.g. so that numbered
   * pagination does not interfere while the infinite scroll mode is not active.
   * @default true
   */
  enabled?: MaybeRef<boolean>
  /**
   * Resets the rendered items to a single chunk whenever this value changes,
   * e.g. when the view component is reused to render another folder.
   */
  resetKey?: MaybeRef<unknown>
  /**
   * Resets the rendered items to a single chunk whenever any of these values
   * change, e.g. when a filter within the view changes.
   */
  resetOn?: MaybeRef<Array<unknown>>
}

export interface InfiniteScrollResult<T> {
  /**
   * The rendered items: a cumulative slice of the given items, the tail grows
   * while the user is scrolling towards the end of the list.
   */
  items: ComputedRef<Array<T>>
  /** Amount of currently rendered items. Can be respected to seed a mode switch. */
  renderedCount: Ref<number>
  total: ComputedRef<number>
  allLoaded: ComputedRef<boolean>
  /** Appends the next chunk to the rendered items. No-op once everything is rendered. */
  loadMore(): void
  /** Extends the rendered items so that the resource with the given id becomes visible. */
  expandTo(resourceId: string): void
}

export function useInfiniteScroll<T>(options: InfiniteScrollOptions<T>): InfiniteScrollResult<T> {
  const renderedCount = ref(PaginationConstants.infiniteScrollChunk)

  const total = computed(() => unref(options.items).length)
  const allLoaded = computed(() => unref(renderedCount) >= unref(total))
  /**
   * Slicing over the min gives a list that stays valid when the given items shrink
   * (e.g. after resources were deleted), no extra clamping required.
   */
  const items = computed(() =>
    unref(options.items).slice(0, Math.min(unref(renderedCount), unref(total)))
  )

  function loadMore() {
    if (unref(allLoaded)) {
      return
    }
    renderedCount.value = Math.min(
      unref(renderedCount) + PaginationConstants.infiniteScrollChunk,
      unref(total)
    )
  }

  function expandToIndex(index: number) {
    if (index < 0 || index >= unref(total)) {
      return
    }
    const chunk = PaginationConstants.infiniteScrollChunk
    renderedCount.value = Math.max(
      unref(renderedCount),
      Math.min(Math.ceil((index + 1) / chunk) * chunk, unref(total))
    )
  }

  function expandTo(resourceId: string) {
    expandToIndex(findIndex(unref(options.items), (item: Item) => (item as Item).id === resourceId))
  }

  function resetRenderedCount() {
    renderedCount.value = Math.min(PaginationConstants.infiniteScrollChunk, unref(total))
  }

  watch(() => unref(options.resetKey), resetRenderedCount)
  watch(() => (unref(options.resetOn) || []).map((refValue) => unref(refValue)), resetRenderedCount)

  const navigateHandler = async ({
    resourceId,
    forceScroll,
    topbarElement
  }: NavigatePageEventPayload) => {
    const index = findIndex(unref(options.items), (item: Item) => (item as Item).id === resourceId)
    if (index >= 0) {
      expandToIndex(index)
      /**
       * The DOM needs to be patched before the scrollTo event is published, otherwise
       * the scroll target can't be found and does not get scrolled to.
       */
      await nextTick()
      eventBus.publish(SCROLL_TO_EVENT, { resourceId, forceScroll, topbarElement })
    }
  }

  let navigateToken: string | null = null
  onBeforeUnmount(() => {
    if (navigateToken) {
      eventBus.unsubscribe(NAVIGATE_PAGE_EVENT, navigateToken)
      navigateToken = null
    }
  })

  watch(
    () => Boolean(unref(options.enabled ?? true)),
    (isEnabled) => {
      if (isEnabled && !navigateToken) {
        navigateToken = eventBus.subscribe<NavigatePageEventPayload>(
          NAVIGATE_PAGE_EVENT,
          navigateHandler
        )
      } else if (!isEnabled && navigateToken) {
        eventBus.unsubscribe(NAVIGATE_PAGE_EVENT, navigateToken)
        navigateToken = null
      }
    },
    { immediate: true }
  )

  return {
    items,
    renderedCount,
    total,
    allLoaded,
    loadMore,
    expandTo
  }
}
