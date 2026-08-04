import {
  buildDeletedResource,
  buildResource,
  Resource,
  WebDavResponseResource
} from '../helpers/resource'
import { DavProperties, DavProperty, DavPropertyValue } from './constants'
import {
  buildPublicSpaceResource,
  buildWebDavSpacesTrashPath,
  isPublicSpaceResource,
  SpaceResource
} from '../helpers'
import { urlJoin } from '../utils'
import { DAV, DAVRequestOptions } from './client'
import { GetPathForFileIdFactory } from './getPathForFileId'
import { WebDavOptions } from './types'
import { getWebDavPath } from './utils'

export type ListFilesOptions = {
  depth?: number
  davProperties?: DavPropertyValue[]
  /**
   * Namespaced props to request for this call only, e.g. `myapp:my-prop`, on top
   * of anything registered globally via `registerExtraProp`. Names keep their own
   * prefix instead of being forced into `oc:`, the prefix is declared for you, and
   * the value lands on `Resource.extraProps` under the name you passed. Use this
   * for props only one caller cares about, so every other PROPFIND in the app
   * doesn't pay for them.
   */
  extraProps?: string[]
  isTrash?: boolean
} & DAVRequestOptions

export const ListFilesFactory = (
  dav: DAV,
  pathForFileIdFactory: ReturnType<typeof GetPathForFileIdFactory>,
  options: WebDavOptions
) => {
  return {
    async listFiles(
      space: SpaceResource,
      { path, fileId }: { path?: string; fileId?: string } = {},
      { depth = 1, davProperties, extraProps = [], isTrash = false, ...opts }: ListFilesOptions = {}
    ): Promise<ListFilesResult> {
      // Globally registered props plus this call's own, for both the request body
      // and the resources built from the response.
      const extraPropNames = [...dav.extraProps, ...extraProps]
      let webDavResources: WebDavResponseResource[]
      if (isPublicSpaceResource(space)) {
        webDavResources = await dav.propfind(urlJoin(space.webDavPath, path), {
          depth,
          properties: davProperties || DavProperties.PublicLink,
          extraProps,
          ...opts
        })

        // FIXME: strip out token, ooof
        webDavResources.forEach((r) => {
          r.filename = r.filename.split('/').slice(1).join('/')
        })

        /**
         * FIXME: This is a workaround for invalid href and downloadURL from the server.
         * this might have been already fixed in the meantime.
         */
        if (webDavResources.length === 1) {
          webDavResources[0].filename = urlJoin(space.id, path, {
            leadingSlash: true
          })
        }

        // We remove the /${publicLinkToken} prefix so the name is relative to the public link root
        // At first we tried to do this in buildResource but only the public link root resource knows it's a public link
        webDavResources.forEach((resource) => {
          resource.filename = resource.filename.split('/').slice(2).join('/')
        })

        const publicLinkType = space.driveAlias.startsWith('ocm/') ? 'ocm' : 'public-link'
        if (
          (!path || path === '/') &&
          depth > 0 &&
          publicLinkType === 'ocm' &&
          webDavResources[0].props[DavProperty.PublicLinkItemType] === 'file'
        ) {
          // ocm public single file shares are missing the current folder in the webdav response from the server.
          // therefore we need to create a dummy resource here to use it as current folder.
          webDavResources = [
            {
              basename: space.fileId,
              type: 'directory',
              filename: '',
              props: {}
            } as WebDavResponseResource,
            ...webDavResources
          ]
        }

        if (!path) {
          const [rootFolder, ...children] = webDavResources
          return {
            resource: buildPublicSpaceResource({
              ...rootFolder,
              id: space.id,
              driveAlias: space.driveAlias,
              webDavPath: space.webDavPath,
              publicLinkType: publicLinkType
            }),
            children: children.map((c) => buildResource(c, extraPropNames))
          } as ListFilesResult
        }
        const resources = webDavResources.map((r) => buildResource(r, extraPropNames))
        return { resource: resources[0], children: resources.slice(1) } as ListFilesResult
      }

      const listFilesCorrectedPath = async () => {
        const correctPath = await pathForFileIdFactory.getPathForFileId(fileId)
        return this.listFiles(space, { path: correctPath }, { depth, davProperties, extraProps })
      }

      try {
        let webDavPath = ''
        if (isTrash) {
          webDavPath = buildWebDavSpacesTrashPath(space.id)
        } else {
          webDavPath = getWebDavPath(space, { fileId, path })
        }

        webDavResources = await dav.propfind(webDavPath, {
          depth,
          properties: davProperties || DavProperties.Default,
          extraProps,
          ...opts
        })
        if (isTrash) {
          return {
            resource: buildResource(webDavResources[0], extraPropNames),
            children: webDavResources.slice(1).map(buildDeletedResource)
          } as ListFilesResult
        }

        const resources = webDavResources.map((r) => buildResource(r, extraPropNames))

        const resourceIsSpace = fileId === space.id
        if (fileId && !resourceIsSpace && resources[0].fileId && fileId !== resources[0].fileId) {
          return listFilesCorrectedPath()
        }
        return { resource: resources[0], children: resources.slice(1) } as ListFilesResult
      } catch (e) {
        if (e.statusCode === 404 && fileId) {
          return listFilesCorrectedPath()
        }
        throw e
      }
    }
  }
}
export interface ListFilesResult {
  resource: Resource
  children?: Resource[]
}
