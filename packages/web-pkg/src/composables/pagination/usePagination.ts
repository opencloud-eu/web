import { computed, ComputedRef, onBeforeUnmount, unref, MaybeRef, WritableComputedRef } from 'vue'
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
}

interface PaginationResult<T> {
  items: ComputedRef<Array<T>>
  total: ComputedRef<number>
  page: ComputedRef<number>
  perPage: ComputedRef<number>
}

export function usePagination<T>(options: PaginationOptions<T>): PaginationResult<T> {
  const router = useRouter()
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

  const navigatePageToken = eventBus.subscribe(
    'app.files.navigate.page',
    ({
      resourceId,
      forceScroll,
      topbarElement
    }: {
      resourceId: string
      forceScroll: boolean
      topbarElement: string
    }) => {
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
  )

  onBeforeUnmount(() => {
    eventBus.unsubscribe('app.files.navigate.page', navigatePageToken)
  })

  return {
    items,
    total,
    page,
    perPage
  }
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

  return useItemsPerPage(options.perPageDefault)
}

/**
 * The items per page of paginated lists, shared by all apps. Only the default differs per app.
 */
export function useItemsPerPage(
  defaultValue = PaginationConstants.perPageDefault
): WritableComputedRef<number> {
  const fallback = parseInt(defaultValue)
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
