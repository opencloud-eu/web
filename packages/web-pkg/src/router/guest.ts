import { RouteComponents } from './router'
import { RouteLocationNamedRaw, RouteRecordRaw } from 'vue-router'
import { createLocation, isLocationActiveDirector } from './utils'
import { $gettext } from '../utils/dummyGettext'

type guestTypes = 'files-guest-link'

export const createLocationGuest = (name: guestTypes, location = {}): RouteLocationNamedRaw =>
  createLocation(name, location)

export const locationGuestLink = createLocationGuest('files-guest-link')

export const isLocationGuestActive = isLocationActiveDirector<guestTypes>(locationGuestLink)

export const buildRoutes = (components: RouteComponents): RouteRecordRaw[] => [
  {
    name: locationGuestLink.name,
    path: '/guest/:shareName?',
    component: components.GuestLink,
    meta: {
      authContext: 'anonymous',
      patchCleanPath: true,
      title: $gettext('Guest invitation')
    }
  }
]
