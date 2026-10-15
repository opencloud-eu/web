import { RouteComponents } from './router'
import { RouteLocationNamedRaw, RouteRecordRaw } from 'vue-router'
import { createLocation, isLocationActiveDirector } from './utils'

type guestTypes = 'files-guest-link'

export const createLocationGuest = (name: guestTypes, location = {}): RouteLocationNamedRaw =>
  createLocation(name, location)

export const locationGuestLink = createLocationGuest('files-guest-link')

export const isLocationGuestActive = isLocationActiveDirector<guestTypes>(locationGuestLink)

export const buildRoutes = (components: RouteComponents): RouteRecordRaw[] => [
  {
    path: '/guest',
    component: components.App,
    meta: {
      authContext: 'guest'
    },
    children: [
      {
        name: locationGuestLink.name,
        path: ':driveAliasAndItem(.*)?',
        component: components.Spaces.DriveResolver,
        meta: {
          authContext: 'guest',
          patchCleanPath: true
        }
      }
    ]
  }
]
