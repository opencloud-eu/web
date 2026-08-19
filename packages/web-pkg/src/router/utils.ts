import { Router, RouteLocationNamedRaw } from 'vue-router'
import merge from 'lodash-es/merge'
import { unref } from 'vue'

export interface ActiveRouteDirectorFunc<T extends string> {
  (router: Router, ...comparatives: T[]): boolean
}

interface ResolvedHrefCache {
  path: string
  currentHref: string
  comparativeHrefs: WeakMap<RouteLocationNamedRaw, string>
}

/**
 * `router.resolve` is expensive, and `isLocationActive` runs hundreds of times
 * per rendered file list item. Both the current route's href and the comparatives'
 * hrefs change on navigation or `addRoute`, so the resolved hrefs are cached per
 * router and per route.
 */
const hrefCaches = new WeakMap<Router, ResolvedHrefCache>()

const stripQuery = (href: string): string => href.split('?')[0]

const getHrefCache = (router: Router): ResolvedHrefCache => {
  const currentRoute = unref(router.currentRoute)
  const cache = hrefCaches.get(router)

  if (cache && cache.path === currentRoute.path) {
    return cache
  }

  // FIXME: router.resolve cleans the path. we don't need it, if we can rely on
  // router.currentRoute to not have slashs encoded for paths
  const nextCache: ResolvedHrefCache = {
    path: currentRoute.path,
    currentHref: stripQuery(router.resolve(currentRoute).href),
    comparativeHrefs: new WeakMap()
  }
  hrefCaches.set(router, nextCache)

  return nextCache
}

const resolveComparativeHref = (
  router: Router,
  cache: ResolvedHrefCache,
  comparative: RouteLocationNamedRaw
): string => {
  const cachedHref = cache.comparativeHrefs.get(comparative)
  if (cachedHref !== undefined) {
    return cachedHref
  }

  const href = stripQuery(router.resolve({ ...comparative }).href)
  cache.comparativeHrefs.set(comparative, href)

  return href
}

/**
 * helper function to find out if comparative route location is active or not.
 * it uses vue router resolve to do so.
 */
export const isLocationActive = (
  router: Router,
  ...comparatives: [RouteLocationNamedRaw, ...RouteLocationNamedRaw[]]
): boolean => {
  const cache = getHrefCache(router)
  return comparatives.some((comparative) =>
    cache.currentHref.startsWith(resolveComparativeHref(router, cache, comparative))
  )
}

/**
 * wraps isLocationActive to be used as a closure,
 * the resulting closure then can be used to check a location against the defined set of director locations
 */
export const isLocationActiveDirector = <T extends string>(
  ...defaultComparatives: [RouteLocationNamedRaw, ...RouteLocationNamedRaw[]]
): ActiveRouteDirectorFunc<T> => {
  return (router: Router, ...comparatives: T[]): boolean => {
    if (!comparatives.length) {
      return isLocationActive(router, ...defaultComparatives)
    }

    const [first, ...rest] = comparatives.map((name) => {
      const match = defaultComparatives.find((c) => c.name === name)

      if (!match) {
        throw new Error(`unknown comparative '${name}'`)
      }

      return match
    })

    return isLocationActive(router, first, ...rest)
  }
}

export { $gettext } from '../utils/dummyGettext'

/**
 * create a location with attached default values
 */
export const createLocation = (
  name: string,
  ...locations: RouteLocationNamedRaw[]
): RouteLocationNamedRaw =>
  merge(
    {},
    {
      name
    },
    ...locations.map((location) => ({
      ...(location.params && { params: location.params }),
      ...(location.query && { query: location.query })
    }))
  )
