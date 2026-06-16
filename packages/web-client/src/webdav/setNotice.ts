import { urlJoin } from '../utils'
import { SpaceResource } from '../helpers'
import { WebDavOptions } from './types'
import { DAV, DAVRequestOptions } from './client'
import { DavProperty } from './constants'

export const SetNoticeFactory = (dav: DAV, options: WebDavOptions) => {
  return {
    setNotice(
      space: SpaceResource,
      { path }: { path: string },
      value: string,
      opts: DAVRequestOptions = {}
    ) {
      const properties = { [DavProperty.Notice]: value }
      return dav.propPatch(urlJoin(space.webDavPath, path), properties, opts)
    }
  }
}
