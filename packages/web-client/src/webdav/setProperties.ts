import { urlJoin } from '../utils'
import { SpaceResource } from '../helpers'
import { WebDavOptions } from './types'
import { DAV, DAVRequestOptions, DavPropertyRecord } from './client'

export const SetPropertiesFactory = (dav: DAV, options: WebDavOptions) => {
  return {
    /**
     * Write WebDAV properties onto a resource via PROPPATCH.
     *
     * Property names are namespaced the same way as in PROPFIND: DAV standard
     * props get `d:`, anything listed in `extraProps` (or registered globally via
     * `registerExtraProp`) keeps its own prefix, everything else falls back to
     * `oc:`. A custom prop must be listed, otherwise it is written as
     * `oc:<name>` - which the server accepts but no PROPFIND can read back.
     */
    setProperties(
      space: SpaceResource,
      { path }: { path: string },
      properties: DavPropertyRecord,
      opts: { extraProps?: string[] } & DAVRequestOptions = {}
    ) {
      return dav.propPatch(urlJoin(space.webDavPath, path), properties, opts)
    }
  }
}
