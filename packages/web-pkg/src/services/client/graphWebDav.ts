import {
  buildPublicSpaceResourceFromDriveItem,
  DavHttpError,
  graphDriveIdOfSpace,
  isPublicSpaceResource,
  PublicSpaceResource,
  Resource,
  urlJoin
} from '@opencloud-eu/web-client'
import { ListFilesResult, WebDAV } from '@opencloud-eu/web-client/webdav'
import { Graph } from '@opencloud-eu/web-client/graph'
import { listFilesViaGraph } from './graphListing'

/**
 * Wrap a WebDAV client so everything that only reads metadata goes through
 * graph instead of a PROPFIND. Callers keep using `clientService.webdav` and
 * get the same shapes back, whichever API answered.
 *
 * What stays on webdav is what graph has no answer for: the trash bin, which
 * has no listing, and the file versions, which have no endpoint.
 */
export function createGraphWebDav(inner: WebDAV, graphClient: () => Graph): WebDAV {
  const listFiles: WebDAV['listFiles'] = async (space, { path, fileId } = {}, options = {}) => {
    if (options.isTrash) {
      return inner.listFiles(space, { path, fileId }, options)
    }

    try {
      const { driveItem, resource, children } = await listFilesViaGraph({
        graphClient: graphClient(),
        space,
        path,
        fileId,
        signal: options.signal,
        withChildren: options.depth !== 0
      })

      // the root of a public link is the space the app navigates in, so it
      // carries the link's own properties rather than being a plain resource
      if (isPublicSpaceResource(space) && !fileId && (!path || path === '/')) {
        return {
          resource: buildPublicSpaceResourceFromDriveItem({
            driveItem,
            resource,
            space: space as PublicSpaceResource,
            drive: await publicLinkDrive(graphClient, graphDriveIdOfSpace(space), options.signal)
          }),
          children
        } as ListFilesResult
      }

      return { resource, children }
    } catch (error) {
      throw asDavError(error)
    }
  }

  return {
    ...inner,

    listFiles,

    async getFileInfo(space, resource = {}, options): Promise<Resource> {
      return (await listFiles(space, resource, { ...options, depth: 0 })).resource
    },

    async getPathForFileId(id, options) {
      try {
        // the item knows where it sits, and the drive it sits in is the first
        // part of its own id
        const driveItem = await graphClient().driveItems.statDriveItem(
          id.split('!')[0],
          { itemId: id },
          {},
          options
        )
        const parentPath = driveItem.parentReference?.path

        return !parentPath || parentPath === '.'
          ? urlJoin(driveItem.name, { leadingSlash: true })
          : urlJoin(parentPath, driveItem.name, { leadingSlash: true })
      } catch (error) {
        throw asDavError(error)
      }
    }
  }
}

// The mountpoint drive of a public link carries its owner. Failing to read it
// costs the owner's name on the drop upload page, nothing else, so a link that
// still works stays usable.
const publicLinkDrive = async (graphClient: () => Graph, driveId: string, signal?: AbortSignal) => {
  try {
    return await graphClient().drives.getDrive(driveId, undefined, { signal })
  } catch {
    return undefined
  }
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
