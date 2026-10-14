import { RouteRecordRaw } from 'vue-router'

import {
  buildRoutes as buildCommonRoutes,
  isLocationCommonActive,
  createLocationCommon
} from './common'
import {
  buildRoutes as buildGuestRoutes,
  createLocationGuest,
  isLocationGuestActive,
  locationGuestLink
} from './guest'
import {
  buildRoutes as buildPublicRoutes,
  createLocationPublic,
  isLocationPublicActive,
  locationPublicLink,
  locationPublicUpload
} from './public'
import { RouteComponents } from './router'
import {
  buildRoutes as buildSharesRoutes,
  isLocationSharesActive,
  createLocationShares,
  locationSharesViaLink,
  locationSharesWithMe,
  locationSharesWithOthers,
  RouteShareTypes
} from './shares'
import {
  buildRoutes as buildSpacesRoutes,
  isLocationSpacesActive,
  createLocationSpaces,
  locationSpacesGeneric
} from './spaces'
import {
  buildRoutes as buildTrashRoutes,
  isLocationTrashActive,
  createLocationTrash
} from './trash'
import { isLocationActive, isLocationActiveDirector, createLocation } from './utils'
import { $gettext } from '../utils/dummyGettext'
import type { ActiveRouteDirectorFunc } from './utils'

const ROOT_ROUTE = {
  name: 'root',
  path: '/',
  redirect: (to) => createLocationSpaces('files-spaces-generic', to)
} as RouteRecordRaw

const buildRoutes = (components: RouteComponents): RouteRecordRaw[] => [
  ROOT_ROUTE,
  ...buildCommonRoutes(components),
  ...buildSharesRoutes(components),
  ...buildPublicRoutes(components),
  ...buildGuestRoutes(components),
  ...buildSpacesRoutes(components),
  ...buildTrashRoutes(components)
]

export {
  createLocation,
  createLocationCommon,
  createLocationShares,
  createLocationSpaces,
  createLocationPublic,
  createLocationGuest,
  isLocationCommonActive,
  isLocationSharesActive,
  isLocationSpacesActive,
  isLocationPublicActive,
  isLocationGuestActive,
  isLocationActive,
  isLocationActiveDirector,
  isLocationTrashActive,
  createLocationTrash,
  locationPublicLink,
  locationPublicUpload,
  locationGuestLink,
  locationSpacesGeneric,
  locationSharesViaLink,
  locationSharesWithMe,
  locationSharesWithOthers,
  buildRoutes,
  ActiveRouteDirectorFunc,
  $gettext
}

export type { RouteShareTypes }
