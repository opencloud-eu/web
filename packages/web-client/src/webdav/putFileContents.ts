import { SpaceResource } from '../helpers'
import { GetFileInfoFactory } from './getFileInfo'
import { WebDavOptions } from './types'
import { DAV, DAVRequestOptions } from './client'
import { getWebDavPath } from './utils'

type PutFileContentsOptions = {
  fileName?: string
  parentFolderId?: string
  path?: string
  content?: string | ArrayBuffer
  previousEntityTag?: string
  overwrite?: boolean
} & DAVRequestOptions

export const PutFileContentsFactory = (
  dav: DAV,
  getFileInfoFactory: ReturnType<typeof GetFileInfoFactory>,
  options: WebDavOptions
) => {
  return {
    async putFileContents(
      space: SpaceResource,
      {
        fileName,
        path,
        parentFolderId,
        content = '',
        previousEntityTag = '',
        overwrite,
        ...opts
      }: PutFileContentsOptions
    ) {
      const webDavPath = getWebDavPath(space, { fileId: parentFolderId, name: fileName, path })
      const { result } = await dav.put(webDavPath, content, {
        previousEntityTag,
        overwrite,
        ...opts
      })

      return getFileInfoFactory.getFileInfo(space, {
        fileId: result.headers.get('Oc-Fileid'),
        path
      })
    }
  }
}
