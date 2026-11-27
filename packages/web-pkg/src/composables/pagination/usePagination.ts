import {
  computed,
  ComputedRef,
  onBeforeUnmount,
  unref,
  MaybeRef,
  ref,
  Ref,
  watch,
  WritableComputedRef
} from 'vue'
import { queryItemAsString } from '../appDefaults'
import { useRouteQuery, useRouter } from '../router'
import { PaginationConstants } from './constants'
import { useLocalStorage } from '@vueuse/core'
import { eventBus } from '../../services'
import { findIndex } from 'lodash-es'
import { Item } from '@opencloud-eu/web-client'

interface PaginationOptions<T> {
  items: MaybeRef<Array<T>>
  page?: MaybeRef<number>
  perPage?: MaybeRef<number>
  perPageDefault?: string
  /**
   * Gates the `app.files.navigate.page` subscription, e.g. so that infinite
   * scrolling does not interfere with the numbered pagination. Defaults to true.
   */
  enabled?: MaybeRef<boolean>
}

interface PaginationResult<T> {
  items: ComputedRef<Array<T>>
  total: ComputedRef<number>
  page: ComputedRef<number>
  perPage: ComputedRef<number>
}

export function usePagination<T>(options: PaginationOptions<T>): PaginationResult<T> {
  const requestedPage = createPageRef<T>(options)
  const perPage = createPerPageRef<T>(options)
  const total = computed(() => {
    return Math.ceil(unref(options.items).length / unref(perPage)) || 1
  })
  const page = computed(() => {
    const clampedPage = Math.min(unref(requestedPage), unref(total))
    return clampedPage >= 1 ? clampedPage : 1
  })
  const items = computed(() => {
    if (!unref(perPage)) {
      return unref(options.items)
    }

    const start = (unref(page) - 1) * unref(perPage)
    const end = start + unref(perPage)

    return unref(options.items).slice(start, end)
  })

  const navigatePageToken = createNavigatePageSubscription<T>(options, perPage)
  onBeforeUnmount(() => {
    if (unref(navigatePageToken)) {
      eventBus.unsubscribe('app.files.navigate.page', unref(navigatePageToken))
    }
  })

  return {
    items,
    total,
    page,
    perPage
  }
}

/**
 * The subscription to the page navigation event lives and dies with the `enabled`
 * option, so that the numbered pagination hands over cleanly to e.g. infinite
 * scrolling during the lifetime of the view.
 */
function createNavigatePageSubscription<T>(
  options: PaginationOptions<T>,
  perPage: ComputedRef<number>
): Ref<string | null> {
  const navigatePageToken = ref<string | null>(null)
  const router = useRouter()

  function pageEventHandler({
    resourceId,
    forceScroll,
    topbarElement
  }: {
    resourceId: string
    forceScroll: boolean
    topbarElement: string
  }) {
    const index = findIndex(unref(options.items), (item: Item) => item.id === resourceId)
    if (index >= 0) {
      const page = Math.ceil((index + 1) / Number(unref(perPage)))
      const route = unref(router.currentRoute)
      router.push({ path: route.path, query: { ...route.query, page } }).then(() => {
        eventBus.publish('app.files.navigate.scrollTo', {
          resourceId,
          forceScroll,
          topbarElement
        })
      })
    }
  }

  watch(
    () => Boolean(unref(options.enabled ?? true)),
    (isEnabled) => {
      if (isEnabled && !unref(navigatePageToken)) {
        navigatePageToken.value = eventBus.subscribe('app.files.navigate.page', pageEventHandler)
      } else if (!isEnabled && unref(navigatePageToken)) {
        eventBus.unsubscribe('app.files.navigate.page', unref(navigatePageToken))
        navigatePageToken.value = null
      }
    },
    { immediate: true }
  )

  return navigatePageToken
}

function createPageRef<T>(options: PaginationOptions<T>): ComputedRef<number> {
  if (options.page) {
    return computed(() => unref(options.page))
  }

  const pageQuery = useRouteQuery('page', '1')
  return computed(() => parseInt(queryItemAsString(unref(pageQuery)), 10))
}

function createPerPageRef<T>(options: PaginationOptions<T>): ComputedRef<number> {
  if (options.perPage) {
    return computed(() => unref(options.perPage))
  }

  return useItemsPerPage(options.perPageDefault)
}

/**
 * The items per page of paginated lists, shared by all apps. Only the default differs per app.
 */
export function useItemsPerPage(
  defaultValue = PaginationConstants.perPageDefault
): WritableComputedRef<number> {
  const fallback = parseInt(defaultValue, 10)
  const itemsPerPage = useLocalStorage<number>('oc-options_items-per-page', fallback, {
    writeDefaults: false
  })

  return computed({
    get() {
      // values below 1 (e.g. from manipulated storage) would break the page count, so they fall back to the default
      const value = unref(itemsPerPage)
      return isNaN(value) || value < 1 ? fallback : value
    },
    set(value) {
      itemsPerPage.value = value
    }
  })
}

/**
 * Infinite scrolling is a files-only display mode. Keep it separate from the
 * numeric items-per-page setting shared by all paginated apps.
 */
export function useIsInfiniteScrollEnabled(): Ref<boolean> {
  return useLocalStorage<boolean>(PaginationConstants.infiniteScrollStorageKey, false, {
    writeDefaults: false
  })
}
