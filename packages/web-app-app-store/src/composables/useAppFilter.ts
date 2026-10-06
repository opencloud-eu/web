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
  const tagQuery = useRouteQuery('q_tag', '')

  const filterTerm = computed(() => queryItemAsString(unref(filterTermQuery)))
  const activeTag = computed(() => queryItemAsString(unref(tagQuery)))

  const searchEngine = computed(() => {
    return new Fuse(unref(apps), { ...defaultFuseOptions, keys: ['name', 'subtitle', 'tags'] })
  })

  const searchedApps = computed(() => {
    const term = unref(filterTerm).trim()
    if (!term) {
      return unref(apps)
    }
    return unref(searchEngine)
      .search(term)
      .map((result) => result.item)
  })

  const filteredApps = computed(() => {
    const tag = unref(activeTag).toLowerCase()
    if (!tag) {
      return unref(searchedApps)
    }
    return unref(searchedApps).filter((app) => app.tags.some((t) => t.toLowerCase() === tag))
  })

  function updateQuery(key: string, value: string) {
    return router.replace({
      query: {
        ...omit(unref(router.currentRoute).query, key),
        ...(value && { [key]: value })
      }
    })
  }

  function setFilterTerm(term: string) {
    return updateQuery('filter', term.trim())
  }

  function setActiveTag(tag: string) {
    return updateQuery('q_tag', tag)
  }

  return { filterTerm, activeTag, searchedApps, filteredApps, setFilterTerm, setActiveTag }
}
