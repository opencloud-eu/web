import { RouteLocation, Router } from 'vue-router'
import {
  contextRouteNameKey,
  contextRouteParamsKey,
  contextRouteQueryKey,
  locationGuestLink,
  locationGuestShares,
  locationPublicLink,
  locationSharesWithMe,
  locationSpacesGeneric,
  queryItemAsString,
  useAuthStore
} from '@opencloud-eu/web-pkg'

/** Context of an app route opened without one: the file's folder, built from the route alone. */
function getContextQuery(to: RouteLocation): Record<string, any> {
  const authStore = useAuthStore()
  const segments = (to.params.driveAliasAndItem as string).split('/').filter(Boolean)
  const [driveType] = segments
  const shareId = queryItemAsString(to.query.shareId)
  const contextQuery = { ...(shareId && { shareId }) }

  // a single file share is the root of its share space, it has no parent folder
  if (['share', 'ocm-share'].includes(driveType) && segments.length <= 2) {
    return {
      [contextRouteNameKey]: authStore.isGuestContext
        ? locationGuestShares.name
        : locationSharesWithMe.name,
      [contextRouteParamsKey]: {},
      [contextRouteQueryKey]: contextQuery
    }
  }

  let name = locationSpacesGeneric.name
  if (['public', 'ocm'].includes(driveType)) {
    name = locationPublicLink.name
  } else if (authStore.isGuestContext) {
    name = locationGuestLink.name
  }

  // drive aliases have two segments, e.g. "personal/admin" or "public/<token>"
  const driveAliasAndItem = segments.slice(0, Math.max(2, segments.length - 1)).join('/')
  return {
    [contextRouteNameKey]: name,
    [contextRouteParamsKey]: { driveAliasAndItem },
    [contextRouteQueryKey]: contextQuery
  }
}

/**
 * Adds a context route to app routes opened without one, e.g. by a bookmarked URL.
 * Auth context, active app detection and closing the app rely on it.
 * Runs before `setupAuthGuard`, so the auth context is derived from the added context route.
 */
export const setupContextRouteGuard = (router: Router) => {
  router.beforeEach((to) => {
    if (
      to.meta?.authContext !== 'hybrid' ||
      !to.params?.driveAliasAndItem ||
      to.query?.[contextRouteNameKey]
    ) {
      return true
    }

    // path instead of name + params, guard redirects bypass the clean path patch
    return { path: to.path, query: { ...to.query, ...getContextQuery(to) }, hash: to.hash }
  })
}
