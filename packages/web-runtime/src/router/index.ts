import AccessDeniedPage from '../pages/accessDenied.vue'
import Account from '../pages/account.vue'
import LoginPage from '../pages/login.vue'
import LogoutPage from '../pages/logout.vue'
import NotFoundPage from '../pages/notFound.vue'
import OidcCallbackPage from '../pages/oidcCallback.vue'
import ResolvePublicLinkPage from '../pages/resolvePublicLink.vue'
import ResolvePrivateLinkPage from '../pages/resolvePrivateLink.vue'
import { setupRouterHooks } from './setupRouter'
import { setupAuthGuard } from './setupAuthGuard'
import { patchRouter } from './patchCleanPath'
import { routeNames } from './names'
import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'

// @ts-ignore
import qs from 'qs'

export * from './helpers'
export { createRouter } from 'vue-router'

// just a dummy function to trick gettext tools
function $gettext(msg: string) {
  return msg
}

export const base = document.querySelector('base')
const routes = [
  {
    path: '/login',
    name: routeNames.login,
    component: LoginPage,
    meta: { title: $gettext('Login'), authContext: 'anonymous' }
  },
  {
    path: '/logout',
    name: routeNames.logout,
    component: LogoutPage,
    meta: { title: $gettext('Logout'), authContext: 'anonymous' }
  },
  {
    path: '/web-oidc-callback',
    name: routeNames.oidcCallback,
    component: OidcCallbackPage,
    meta: { title: $gettext('Oidc callback'), authContext: 'anonymous' }
  },
  {
    path: '/web-oidc-silent-redirect',
    name: routeNames.oidcSilentRedirect,
    component: OidcCallbackPage,
    meta: { title: $gettext('Oidc redirect'), authContext: 'anonymous' }
  },
  {
    path: '/f/:fileId',
    name: routeNames.resolvePrivateLink,
    component: ResolvePrivateLinkPage,
    meta: { title: $gettext('Private link'), authContext: 'user' }
  },
  {
    path: '/s/:token/:driveAliasAndItem(.*)?',
    name: routeNames.resolvePublicLink,
    component: ResolvePublicLinkPage,
    meta: { title: $gettext('Public link'), authContext: 'anonymous' }
  },
  {
    path: '/i/:token/:driveAliasAndItem(.*)?',
    name: routeNames.resolveInternalLink,
    component: ResolvePublicLinkPage,
    meta: { title: $gettext('Internal link'), authContext: 'user' }
  },
  {
    path: '/o/:token/:driveAliasAndItem(.*)?',
    name: routeNames.resolvePublicOcmLink,
    component: ResolvePublicLinkPage,
    meta: { title: $gettext('OCM link'), authContext: 'anonymous' }
  },
  {
    path: '/access-denied',
    name: routeNames.accessDenied,
    component: AccessDeniedPage,
    meta: { title: $gettext('Access denied'), authContext: 'anonymous' }
  },
  {
    path: '/account',
    name: routeNames.account,
    component: Account,
    meta: { title: $gettext('Account'), authContext: 'hybrid' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: routeNames.notFound,
    component: NotFoundPage,
    meta: { title: $gettext('Not found'), authContext: 'hybrid' }
  }
]
export const router = patchRouter(
  createRouter({
    parseQuery(query) {
      return qs.parse(query, {
        allowDots: true
      })
    },
    stringifyQuery(obj) {
      return qs.stringify(obj, {
        allowDots: true
      })
    },
    history: (base && createWebHistory(new URL(base.href).pathname)) || createWebHashHistory(),
    routes
  })
)

setupRouterHooks(router)
setupAuthGuard(router)
