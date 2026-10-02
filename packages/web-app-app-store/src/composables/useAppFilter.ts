import { computed, Ref, unref } from 'vue'
import Fuse from 'fuse.js'
import { omit } from 'lodash-es'
import {
  defaultFuseOptions,
  queryItemAsString,
  useRouteQuery,
  useRouter
} from '@opencloud-eu/web-pkg'
import { App } from '../types'

export function useAppFilter(apps: Ref<App[]>) {
  const router = useRouter()
  const filterTermQuery = useRouteQuery('filter', '')

  const filterTerm = computed(() => queryItemAsString(unref(filterTermQuery)))

  const searchEngine = computed(() => {
    return new Fuse(unref(apps), { ...defaultFuseOptions, keys: ['name', 'subtitle', 'tags'] })
  })

  const filteredApps = computed(() => {
    const term = unref(filterTerm).trim()
    if (!term) {
      return unref(apps)
    }
    return unref(searchEngine)
      .search(term)
      .map((result) => result.item)
  })

  function setFilterTerm(term: string) {
    return router.replace({
      query: {
        ...omit(unref(router.currentRoute).query, 'filter'),
        ...(term && { filter: term.trim() })
      }
    })
  }

  return { filterTerm, filteredApps, setFilterTerm }
}
