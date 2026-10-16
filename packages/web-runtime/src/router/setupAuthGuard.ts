import {
  extractPublicLinkToken,
  isGuestContextRequired,
  isIdpContextRequired,
  isPublicLinkContextRequired,
  isUserContextRequired
} from './helpers'
import { Router, RouteLocation } from 'vue-router'
import {
  contextRouteNameKey,
  queryItemAsString,
  useAuthStore,
  useEmbedMode
} from '@opencloud-eu/web-pkg'
import { authService } from '../services/auth/authService'
import { unref } from 'vue'

export const setupAuthGuard = (router: Router) => {
  router.beforeEach(async (to, from) => {
    const { isDelegatingAuthentication } = useEmbedMode()

    if (from && to.path === from.path && !hasContextRouteNameChanged(to, from)) {
      // note: except for the context route, query changes can never trigger re-init of the auth context
      return true
    }

    const authStore = useAuthStore()
    await authService.initializeContext(to)
    // consume it in any case, so it can't redirect a later navigation
    const expiredGuestPermissionId = authService.consumeExpiredGuestPermissionId()
    const unavailableGuestPermissionId = authService.consumeUnavailableGuestPermissionId()

    // vue-router currently (4.1.6) does not cancel navigations when a new one is triggered
    // we need to guard this case to be able to show the access denied page
    // and not be redirected to the login page
    if (authService.hasAuthErrorOccurred) {
      return to.name === 'accessDenied' || { name: 'accessDenied' }
    }

    if (expiredGuestPermissionId) {
      return {
        name: 'renewGuestLink',
        params: { permissionId: expiredGuestPermissionId },
        query: { redirectUrl: to.fullPath }
      }
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

    if (isGuestContextRequired(router, to)) {
      // guest and user context can't share a tab, a full page load initializes the guest context alone
      if (authStore.userContextReady) {
        window.location.assign(router.resolve(to).href)
        return false
      }
      if (!authStore.guestContextReady) {
        // the session might still be valid, e.g. after a network error, so the renew page
        // resumes it first and only renews the link if it's invalid
        const permissionId =
          queryItemAsString(to.query.permissionId) || unavailableGuestPermissionId
        if (!permissionId) {
          return { name: 'accessDenied' }
        }
        return {
          name: 'renewGuestLink',
          params: { permissionId },
          query: { resume: 'true', redirectUrl: to.fullPath }
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
      !isGuestContextRequired(router, to)
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
