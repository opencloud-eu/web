import { computed, ComputedRef, onBeforeUnmount, unref, MaybeRef } from 'vue'
import { queryItemAsString } from '../appDefaults'
import { useRouteQuery, useRouteQueryPersisted } from '../router'
import { PaginationConstants } from './constants'
import { eventBus } from '../../services'
import { findIndex } from 'lodash-es'
import { useRoute, useRouter } from 'vue-router'
import { Item } from '@opencloud-eu/web-client'

interface PaginationOptions<T> {
  items: MaybeRef<Array<T>>
  page?: MaybeRef<number>
  perPage?: MaybeRef<number>
  perPageDefault?: string
  perPageQueryName?: string
  perPageStoragePrefix: string
}

interface PaginationResult<T> {
  items: ComputedRef<Array<T>>
  total: ComputedRef<number>
  page: ComputedRef<number>
  perPage: ComputedRef<number>
}

export function usePagination<T>(options: PaginationOptions<T>): PaginationResult<T> {
  const router = useRouter()
  const route = useRoute()
  const page = createPageRef<T>(options)
  const perPage = createPerPageRef<T>(options)
  const total = computed(() => {
    return Math.ceil(unref(options.items).length / unref(perPage)) || 1
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
        router.push({ ...unref(route), query: { ...unref(route).query, page } }).then(() => {
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

  const perPageDefault = options.perPageDefault || PaginationConstants.perPageDefault
  const perPageQuery = useRouteQueryPersisted({
    name: options.perPageQueryName || PaginationConstants.perPageQueryName,
    defaultValue: perPageDefault,
    storagePrefix: options.perPageStoragePrefix
  })
  return computed(() => {
    // the route query is populated asynchronously, so it can still be missing on
    // the first render. Falling back to the default keeps `items` from returning
    // the whole (potentially huge) list for one render pass.
    const perPage = parseInt(queryItemAsString(unref(perPageQuery)))
    return isNaN(perPage) ? parseInt(perPageDefault) : perPage
  })
}
