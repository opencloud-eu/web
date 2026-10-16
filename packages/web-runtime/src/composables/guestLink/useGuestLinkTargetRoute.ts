import { RouteLocationNamedRaw } from 'vue-router'
import { Resource } from '@opencloud-eu/web-client'
import {
  createLocationGuest,
  useAuthStore,
  useClientService,
  useLinkTargetRoute
} from '@opencloud-eu/web-pkg'
import { GuestSession } from '../../services/auth/guestSessionManager'

/**
 * Builds the landing route of a guest session. A folder share resolves into its file list, a
 * single file share into its default app or, without one, into the guest shares list.
 */
export const useGuestLinkTargetRoute = () => {
  const authStore = useAuthStore()
  const clientService = useClientService()
  const { getLinkTargetRoute } = useLinkTargetRoute()

  async function getGuestLinkTargetRoute({
    permissionId,
    space
  }: GuestSession): Promise<RouteLocationNamedRaw> {
    const shareRootLocation = createLocationGuest('files-guest-link', {
      params: { driveAliasAndItem: space.driveAlias },
      query: { shareId: space.id, permissionId }
    })

    // with a user context, the auth guard reloads the share root into a clean guest context
    if (!authStore.isGuestContext) {
      return shareRootLocation
    }

    let resource: Resource
    try {
      resource = await clientService.webdav.getFileInfo(space)
    } catch (error) {
      // the file list handles the error
      console.error(error)
      return shareRootLocation
    }

    if (resource.isFolder) {
      return shareRootLocation
    }

    const location = getLinkTargetRoute({ space, resource, path: '/' })
    return { ...location, query: { ...location.query, permissionId } }
  }

  return { getGuestLinkTargetRoute }
}
