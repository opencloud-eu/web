import { computed, ComputedRef, MaybeRef, ref, unref, watch, WritableComputedRef } from 'vue'

export interface LocalPaginationOptions<T> {
  items: MaybeRef<Array<T>>
  perPage?: MaybeRef<number>
  /**
   * Sources that reset the current page back to the first one, e.g. the active filter term.
   */
  resetOn?: MaybeRef<unknown> | Array<MaybeRef<unknown>>
}

export interface LocalPaginationResult<T> {
  currentPage: WritableComputedRef<number>
  totalPages: ComputedRef<number>
  paginatedItems: ComputedRef<Array<T>>
}

/**
 * Paginates a list of items in memory, keeping the current page in component local state.
 *
 * Use this instead of `usePagination` wherever the page must not be part of the route,
 * e.g. inside a sidebar panel that is rendered next to an already paginated list.
 *
 * The current page is reset whenever one of the given `resetOn` sources changes, so applying a
 * filter always starts over on the first page. It is also clamped to the available pages, which
 * keeps the page in range if items are removed from the list.
 */
export function useLocalPagination<T>({
  items,
  perPage = 20,
  resetOn = []
}: LocalPaginationOptions<T>): LocalPaginationResult<T> {
  const page = ref(1)

  const totalPages = computed(() =>
    Math.max(1, Math.ceil(unref(items).length / Math.max(1, unref(perPage))))
  )

  const currentPage = computed({
    get: () => Math.min(Math.max(1, unref(page)), unref(totalPages)),
    set: (value: number) => {
      page.value = value
    }
  })

  const paginatedItems = computed(() => {
    const start = (unref(currentPage) - 1) * unref(perPage)
    return unref(items).slice(start, start + unref(perPage))
  })

  const resetSources = Array.isArray(resetOn) ? resetOn : [resetOn]

  watch([() => unref(perPage), ...resetSources.map((source) => () => unref(source))], () => {
    page.value = 1
  })

  return {
    currentPage,
    totalPages,
    paginatedItems
  }
}
