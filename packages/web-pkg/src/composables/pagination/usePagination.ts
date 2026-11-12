import { computed, ComputedRef, onBeforeUnmount, unref, MaybeRef, ref, Ref, watch } from 'vue'
import { queryItemAsString } from '../appDefaults'
import { useRouteQuery, useRouteQueryPersisted, useRouter } from '../router'
import { PaginationConstants } from './constants'
import { eventBus } from '../../services'
import { findIndex } from 'lodash-es'
import { Item } from '@opencloud-eu/web-client'

interface PaginationOptions<T> {
  items: MaybeRef<Array<T>>
  page?: MaybeRef<number>
  perPage?: MaybeRef<number>
  perPageDefault?: string
  perPageQueryName?: string
  perPageStoragePrefix: string
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
): Ref<string> {
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
  return computed(() => parseInt(queryItemAsString(unref(pageQuery))))
}

function createPerPageRef<T>(options: PaginationOptions<T>): ComputedRef<number> {
  if (options.perPage) {
    return computed(() => unref(options.perPage))
  }

  const perPageDefault = options.perPageDefault || PaginationConstants.perPageDefault
  const perPageQuery = useRouteQueryPersisted({
    name: options.perPageQueryName || PaginationConstants.perPageQueryName,
    defaultValue: perPageDefault,
    storagePrefix: options.perPageStoragePrefix
  })
  return computed(() => {
    // the route query is populated asynchronously, so it can still be missing on
    // the first render. Falling back to the default keeps `items` from returning
    // the whole (potentially huge) list for one render pass. Values below 1 (e.g.
    // from a manipulated URL) would break the page count, so they fall back too.
    const perPage = parseInt(queryItemAsString(unref(perPageQuery)))
    return isNaN(perPage) || perPage < 1 ? parseInt(perPageDefault) : perPage
  })
}
