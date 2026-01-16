import { Resource, SpaceResource } from '../helpers'
import { urlJoin } from '../utils'
import { GetFileContentsFactory } from './getFileContents'
import { WebDavOptions } from './types'
import { DAV, DAVRequestOptions } from './client'
import { ocs } from '../ocs'
import { GetFileInfoFactory } from './getFileInfo'
import { DavProperty } from './constants'

export const GetFileUrlFactory = (
  dav: DAV,
  getFileContentsFactory: ReturnType<typeof GetFileContentsFactory>,
  getFileInfoFactory: ReturnType<typeof GetFileInfoFactory>,
  { axiosClient, baseUrl }: WebDavOptions
) => {
  return {
    async getFileUrl(
      space: SpaceResource,
      resource: Resource,
      {
        disposition = 'attachment',
        version = null,
        username = '',
        ...opts
      }: {
        disposition?: 'inline' | 'attachment'
        version?: string
        username?: string
      } & DAVRequestOptions
    ): Promise<string> {
      // FIXME: re-introduce query parameters
      // They are not supported by getFileContents() and as we don't need them right now, I'm disabling the feature completely for now
      //
      // Since the pre-signed url contains query parameters and the caller of this method
      // can also provide query parameters we have to combine them.
      // const queryStr = qs.stringify(options.query || null)
      // const [url, signedQuery] = downloadURL.split('?')
      // const combinedQuery = [queryStr, signedQuery].filter(Boolean).join('&')
      // downloadURL = [url, combinedQuery].filter(Boolean).join('?')
      if (disposition === 'inline') {
        const response = await getFileContentsFactory.getFileContents(space, resource, {
          responseType: 'blob',
          ...opts
        })
        return URL.createObjectURL(response.body)
      }

      if (version) {
        if (!username) {
          throw new Error('username is required for URL signing')
        }
        // FIXME: remove as soon as we remove client side url signing https://github.com/opencloud-eu/opencloud/issues/1197
        const downloadURL = dav.getFileUrl(urlJoin('meta', resource.fileId, 'v', version))
        const ocsClient = ocs(baseUrl, axiosClient)
        return await ocsClient.signUrl(downloadURL, username)
      }

      if (resource.downloadURL) {
        return resource.downloadURL
      }

      const { downloadURL } = await getFileInfoFactory.getFileInfo(space, resource, {
        davProperties: [DavProperty.DownloadURL]
      })
      return downloadURL
    },
    revokeUrl: (url: string) => {
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url)
      }
    }
  }
}
