import { computed } from 'vue'
import { useRouteQuery, queryItemAsString } from '@opencloud-eu/web-pkg'

export const useRouteQueryId = (queryParamName: string) => {
  const query = useRouteQuery(queryParamName)

  return computed<string>({
    get: () => queryItemAsString(query.value),
    set: (value: string) => {
      query.value = value || null
    }
  })
}
