import { RouteLocationNamedRaw } from 'vue-router'
import { AuthStore, SpacesStore } from '../../composables'
import { createLocationGuest } from '../../router'
import { createFileRouteOptions } from './routeOptions'

/**
 * Location of the guest's share root. Falls back to the renew page, which resumes a missing guest space.
 */
export const createGuestHomeLocation = ({
  authStore,
  spacesStore
}: {
  authStore: AuthStore
  spacesStore: SpacesStore
}): RouteLocationNamedRaw => {
  const guestSpace = spacesStore.getSpace(authStore.guestSpaceId)
  if (guestSpace) {
    return createLocationGuest('files-guest-link', createFileRouteOptions(guestSpace))
  }

  return {
    name: 'renewGuestLink',
    params: { permissionId: authStore.guestPermissionId },
    query: { resume: 'true' }
  }
}
