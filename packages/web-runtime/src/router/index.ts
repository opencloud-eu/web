import AccessDeniedPage from '../pages/accessDenied.vue'
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
import {
  createRouter,
  createWebHashHistory,
  createWebHistory,
  RouteLocationNamedRaw,
  RouteRecordRaw
} from 'vue-router'

// @ts-ignore
import qs from 'qs'
import AccountCalendar from '../pages/account/accountCalendar.vue'
import AccountExtensions from '../pages/account/accountExtensions.vue'
import AccountPreferences from '../pages/account/accountPreferences.vue'
import AccountInformation from '../pages/account/accountInformation.vue'
import AccountLayout from '../pages/account/accountLayout.vue'
import AccountGDPR from '../pages/account/accountGDPR.vue'
import { createLocation, isLocationActiveDirector } from '@opencloud-eu/web-pkg'
import AccountExtensionLayout from '../pages/account/accountExtensionLayout.vue'

export * from './helpers'
export { createRouter } from 'vue-router'

// just a dummy function to trick gettext tools
function $gettext(msg: string) {
  return msg
}

export type RouteAccountTypes =
  | 'account-information'
  | 'account-preferences'
  | 'account-extensions'
  | 'account-calendar'
  | 'account-gdpr'
  | 'account-extension'

export const createLocationAccount = (
  name: RouteAccountTypes,
  location = {}
): RouteLocationNamedRaw => createLocation(name, location)

export const locationAccountInformation = createLocationAccount('account-information')
export const locationAccountPreferences = createLocationAccount('account-preferences')
export const locationAccountExtensions = createLocationAccount('account-extensions')
export const locationAccountCalendar = createLocationAccount('account-calendar')
export const locationAccountGDPR = createLocationAccount('account-gdpr')
export const locationAccountExtension = createLocationAccount('account-extension')

export const isLocationAccountActive = isLocationActiveDirector<RouteAccountTypes>(
  locationAccountInformation,
  locationAccountPreferences,
  locationAccountExtensions,
  locationAccountCalendar,
  locationAccountGDPR
)

export const base = document.querySelector('base')
const routes: readonly RouteRecordRaw[] = [
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
    component: AccountLayout,
    redirect: { name: locationAccountInformation.name },
    meta: { title: $gettext('Account'), authContext: 'hybrid' },
    children: [
      {
        path: 'information',
        name: locationAccountInformation.name,
        component: AccountInformation,
        meta: { authContext: 'user' }
      },
      {
        path: 'preferences',
        name: locationAccountPreferences.name,
        component: AccountPreferences,
        meta: { authContext: 'hybrid' }
      },
      {
        path: 'extensions',
        name: locationAccountExtensions.name,
        component: AccountExtensions,
        meta: { authContext: 'user' }
      },
      {
        path: 'calendar',
        name: locationAccountCalendar.name,
        component: AccountCalendar
      },
      {
        path: 'gdpr',
        name: locationAccountGDPR.name,
        component: AccountGDPR,
        meta: { authContext: 'user' }
      },
      {
        path: 'extension',
        name: locationAccountExtension.name,
        component: AccountExtensionLayout,
        meta: { authContext: 'user' }
      }
    ]
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
