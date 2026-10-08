import {
  extractPublicLinkToken,
  isIdpContextRequired,
  isPublicLinkContextRequired,
  isUserContextRequired
} from './helpers'
import { Router, RouteLocation } from 'vue-router'
import {
  contextRouteNameKey,
  locationGuestLink,
  queryItemAsString,
  useAuthStore,
  useEmbedMode
} from '@opencloud-eu/web-pkg'
import { authService } from '../services/auth/authService'
import { unref } from 'vue'

const routesWithGuestPermissionId = [locationGuestLink.name]

export const setupAuthGuard = (router: Router) => {
  router.beforeEach(async (to, from) => {
    const { isDelegatingAuthentication } = useEmbedMode()

    if (from && to.path === from.path && !hasContextRouteNameChanged(to, from)) {
      // note: except for the context route, query changes can never trigger re-init of the auth context
      return true
    }

    const authStore = useAuthStore()
    await authService.initializeContext(to)

    // vue-router currently (4.1.6) does not cancel navigations when a new one is triggered
    // we need to guard this case to be able to show the access denied page
    // and not be redirected to the login page
    if (authService.hasAuthErrorOccurred) {
      return to.name === 'accessDenied' || { name: 'accessDenied' }
    }

    if (isPublicLinkContextRequired(router, to)) {
      if (!authStore.publicLinkContextReady) {
        const publicLinkToken = extractPublicLinkToken(to)
        return {
          name: 'resolvePublicLink',
          params: { token: publicLinkToken },
          query: { redirectUrl: to.fullPath }
        }
      }
      return true
    }

    if (isUserContextRequired(router, to)) {
      if (!authStore.userContextReady) {
        if (unref(isDelegatingAuthentication)) {
          return { path: '/web-oidc-callback' }
        }

        return { path: '/login', query: { redirectUrl: to.fullPath } }
      }
      return true
    }

    if (isIdpContextRequired(router, to)) {
      if (!authStore.idpContextReady) {
        if (unref(isDelegatingAuthentication)) {
          return { path: '/web-oidc-callback' }
        }

        return { path: '/login', query: { redirectUrl: to.fullPath } }
      }
      return true
    }

    return true
  })
  router.beforeEach((to) => {
    const authStore = useAuthStore()
    if (
      !authStore.guestContextReady ||
      to.query.permissionId ||
      !routesWithGuestPermissionId.includes(to.name)
    ) {
      return true
    }
    return {
      path: to.path,
      hash: to.hash,
      query: { ...to.query, permissionId: authStore.guestPermissionId }
    }
  })
  router.afterEach((to) => {
    if (to.name !== 'accessDenied') {
      return
    }
    authService.hasAuthErrorOccurred = false
  })
}

export const hasContextRouteNameChanged = (to: RouteLocation, from: RouteLocation): boolean => {
  if (!to.query[contextRouteNameKey] && !from.query[contextRouteNameKey]) {
    return false
  }

  return (
    queryItemAsString(to.query[contextRouteNameKey]) !==
    queryItemAsString(from.query[contextRouteNameKey])
  )
}
