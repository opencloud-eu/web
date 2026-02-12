import { computed, type Ref } from 'vue'
import { useRouteQuery } from '@opencloud-eu/web-pkg/src'

export type RouteQueryValue = string | string[] | null | undefined

export const toSingleString = (v: RouteQueryValue): string => {
  if (Array.isArray(v)) return v[0] ?? ''
  return v ?? ''
}

export const useRouteQueryId = (queryParamName: string) => {
  const query = useRouteQuery(queryParamName) as unknown as Ref<RouteQueryValue>

  return computed<string>({
    get: () => toSingleString(query.value),
    set: (value: string) => {
      query.value = value || null
    }
  })
}
