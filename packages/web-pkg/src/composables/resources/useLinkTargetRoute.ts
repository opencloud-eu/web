import { ref } from 'vue'
import { RouteLocationNamedRaw } from 'vue-router'
import { dirname } from 'path'
import {
  isPublicSpaceResource,
  isShareSpaceResource,
  Resource,
  SpaceResource,
  urlJoin
} from '@opencloud-eu/web-client'
import { useResourceLink } from './useResourceLink'
import { createFileRouteOptions } from '../../helpers/router'
import {
  createLocationGuest,
  createLocationPublic,
  createLocationShares,
  createLocationSpaces
} from '../../router'
import {
  contextRouteNameKey,
  contextRouteParamsKey,
  contextRouteQueryKey
} from '../appDefaults/useAppNavigation'
import { useAuthStore } from '../piniaStores'

export type LinkTargetRouteOptions = {
  space: SpaceResource
  resource: Resource
  path: string
  /**
   * Open the resource with its default app (e.g. an editor) if one is registered.
   * Falls back to the file list if no app is available.
   */
  openWithDefaultApp?: boolean
  /**
   * Opens the given side bar panel in the file list. Suppresses `openWithDefaultApp`.
   */
  details?: string
  /**
   * Additional query params for the file list, e.g. filters.
   */
  fileListQuery?: Record<string, string>
}

/**
 * Builds the target route for link resolving (private links, public links, guest links).
 * Resolves to the resource's default app if there is one, otherwise to the file list.
 */
export const useLinkTargetRoute = () => {
  const authStore = useAuthStore()
  const linkSpace = ref<SpaceResource>()
  const { getResourceLink } = useResourceLink({ space: linkSpace })

  const getFileListLocation = (space: SpaceResource, path: string) => {
    if (isPublicSpaceResource(space)) {
      return createLocationPublic('files-public-link')
    }
    if (isShareSpaceResource(space) && path === '/') {
      return authStore.isGuestContext
        ? createLocationGuest('files-guest-shares')
        : createLocationShares('files-shares-with-me')
    }
    if (authStore.isGuestContext) {
      return createLocationGuest('files-guest-link')
    }
    return createLocationSpaces('files-spaces-generic')
  }

  const getLinkTargetRoute = ({
    space: targetSpace,
    resource,
    path,
    openWithDefaultApp = true,
    details,
    fileListQuery = {}
  }: LinkTargetRouteOptions): RouteLocationNamedRaw => {
    linkSpace.value = targetSpace

    const isFolder = resource.isFolder || resource.type === 'folder'
    const fileListLocation = getFileListLocation(targetSpace, path)

    // inside a public link the parent folder id of a resource points to a location outside of the
    // link, so the link root is the only id that can be resolved by the file list.
    // the same applies to the root of a single file share, which has no parent within the share.
    let parentFolderId = resource.parentFolderId
    if (isPublicSpaceResource(targetSpace)) {
      parentFolderId = targetSpace.fileId
    } else if (isShareSpaceResource(targetSpace) && path === '/') {
      parentFolderId = undefined
    }

    if (openWithDefaultApp && !details) {
      // try to get the resource link via a registered action for this resource type.
      // if no action is available, construct the file list route instead (see down below).
      const link = getResourceLink({ ...resource, path }) as RouteLocationNamedRaw

      if (link) {
        let contextQuery: Record<string, any>
        if (!isFolder) {
          // a file needs context query params so the user can successfully close the editor
          // and land on the correct page.
          contextQuery = {
            [contextRouteNameKey]: fileListLocation.name,
            [contextRouteParamsKey]: {
              driveAliasAndItem: urlJoin(targetSpace.driveAlias, dirname(path), {
                leadingSlash: false
              })
            },
            [contextRouteQueryKey]: {
              ...(parentFolderId && { fileId: parentFolderId }),
              ...(link.query?.shareId && { shareId: link.query.shareId }),
              ...fileListQuery
            }
          }
        }

        return {
          ...link,
          query: { ...link.query, ...contextQuery }
        }
      }
    }

    const { params, query } = createFileRouteOptions(targetSpace, {
      fileId: isFolder ? resource.fileId : parentFolderId,
      path: isFolder ? path : dirname(path)
    })

    return {
      ...fileListLocation,
      params,
      query: {
        ...query,
        ...(!isFolder && { scrollTo: resource.fileId }),
        ...(details && { details }),
        ...fileListQuery
      }
    }
  }

  return { getLinkTargetRoute }
}
