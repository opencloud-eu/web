import {
  buildPublicSpaceResourceFromDriveItem,
  buildResourceFromDriveItem,
  DavHttpError,
  graphDriveIdOfSpace,
  graphRefOfSpace,
  isPublicSpaceResource,
  PublicSpaceResource,
  Resource,
  SpaceResource,
  urlJoin
} from '@opencloud-eu/web-client'
import { WebDAV } from '@opencloud-eu/web-client/webdav'
import { Graph } from '@opencloud-eu/web-client/graph'
import {
  GetDriveItemV1ExpandEnum,
  GetDriveItemV1SelectEnum
} from '@opencloud-eu/web-client/graph/generated'

const statSelect = new Set<GetDriveItemV1SelectEnum>([
  '@libre.graph.permissions.actions.allowedValues',
  '@libre.graph.shareTypes',
  '@microsoft.graph.downloadUrl'
])
const statExpand = new Set<GetDriveItemV1ExpandEnum>(['thumbnails'])

/**
 * Wrap a WebDAV client so a single stat goes through graph instead of a
 * PROPFIND with depth 0. Callers keep using `clientService.webdav.getFileInfo`
 * and get the same Resource back, whichever API answered.
 *
 * Everything a stat can be addressed by works: an item id, a path (through
 * graph's colon syntax) and a public link, which is a drive of its own built
 * from the link token.
 */
export function createGraphWebDav(inner: WebDAV, graphClient: () => Graph): WebDAV {
  return {
    ...inner,

    async getFileInfo(space, resource = {}, options): Promise<Resource> {
      const driveId = graphDriveIdOfSpace(space)
      // a public link is identified by its token, and the first stat runs
      // before the auth store knows about it: it is what tells the client
      // whether the link needs a password at all
      const requestOptions = {
        signal: options?.signal,
        ...(isPublicSpaceResource(space) && { headers: { 'public-token': space.id.toString() } })
      }

      try {
        const driveItem = await graphClient().driveItems.statDriveItem(
          driveId,
          graphRefOfSpace(space, resource),
          { select: statSelect, expand: statExpand },
          requestOptions
        )
        const built = buildResourceFromDriveItem(
          driveItem,
          space,
          '',
          pathOf(driveItem, space, resource)
        )

        // the root of a public link is the space the app navigates in, so it
        // carries the link's own properties rather than being a plain resource
        if (isPublicSpaceResource(space) && !resource.fileId && !resource.path) {
          return buildPublicSpaceResourceFromDriveItem({
            driveItem,
            resource: built,
            space: space as PublicSpaceResource,
            drive: await publicLinkDrive(graphClient, driveId, requestOptions)
          })
        }

        return built
      } catch (error) {
        throw asDavError(error)
      }
    }
  }
}

// The mountpoint drive of a public link carries its owner. Failing to read it
// costs the owner's name on the drop upload page, nothing else, so a link that
// still works stays usable.
const publicLinkDrive = async (
  graphClient: () => Graph,
  driveId: string,
  requestOptions: Record<string, unknown>
) => {
  try {
    return await graphClient().drives.getDrive(driveId, undefined, requestOptions)
  } catch {
    return undefined
  }
}

// The item carries its path in drive coordinates, which is what the caller
// asked for everywhere except a share space: that one is rooted at the shared
// item, so the requested path is the one relative to it.
const pathOf = (
  driveItem: { name?: string; parentReference?: { path?: string } },
  space: SpaceResource,
  resource: { path?: string }
) => {
  if (resource.path) {
    return resource.path
  }
  const parentPath = driveItem.parentReference?.path
  return !parentPath || parentPath === '.'
    ? '/'
    : urlJoin(parentPath, driveItem.name, { leadingSlash: true })
}

// Callers branch on the shape webdav throws: a status code and, for a public
// link, the code that tells "needs a password" from "wrong password" apart.
// Graph carries the same information in its error body.
const asDavError = (error: any) => {
  const response = error?.response
  if (!response) {
    return error
  }

  const code = response.data?.error?.code
  const message = response.data?.error?.message || error.message

  return new DavHttpError(message, davErrorCodes[code] ?? code, response, response.status)
}

const davErrorCodes: Record<string, string> = {
  publicLinkPasswordRequired: 'ERR_MISSING_BASIC_AUTH',
  publicLinkPasswordInvalid: 'ERR_INVALID_CREDENTIALS'
}
