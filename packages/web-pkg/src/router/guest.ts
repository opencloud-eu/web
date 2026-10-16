import { RouteComponents } from './router'
import { RouteLocationNamedRaw, RouteRecordRaw } from 'vue-router'
import { createLocation, isLocationActiveDirector } from './utils'
import { $gettext } from '../utils/dummyGettext'

type guestTypes = 'files-guest-link' | 'files-guest-shares'

export const createLocationGuest = (name: guestTypes, location = {}): RouteLocationNamedRaw =>
  createLocation(name, location)

export const locationGuestLink = createLocationGuest('files-guest-link')
export const locationGuestShares = createLocationGuest('files-guest-shares')

export const isLocationGuestActive = isLocationActiveDirector<guestTypes>(
  locationGuestLink,
  locationGuestShares
)

export const buildRoutes = (components: RouteComponents): RouteRecordRaw[] => [
  {
    path: '/guest',
    component: components.App,
    meta: {
      authContext: 'guest'
    },
    children: [
      {
        name: locationGuestShares.name,
        path: 'shares',
        component: components.Shares.GuestSharedWithMe,
        meta: {
          authContext: 'guest',
          title: $gettext('Files shared with me')
        }
      },
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
