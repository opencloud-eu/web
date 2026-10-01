import { computed, Ref, unref } from 'vue'
import { useRouteQuery } from './useRouteQuery'

/**
 * Persists a filter term in the route query, so it survives page reloads and navigating back.
 * An empty term removes the query parameter.
 */
export function useRouteQueryFilterTerm(name = 'q_search_term'): Ref<string> {
  const query = useRouteQuery(name)

  return computed({
    get() {
      const value = unref(query)
      return (Array.isArray(value) ? value[0] : value) || ''
    },
    set(value: string) {
      query.value = value || undefined
    }
  })
}
