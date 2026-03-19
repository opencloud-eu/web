import { DAV, DAVRequestOptions } from './client'
import { DavProperties, DavPropertyValue } from './constants'

export const ListFavoriteFilesFactory = (dav: DAV) => {
  return {
    async listFavoriteFiles({
      davProperties = DavProperties.Default,
      ...opts
    }: { davProperties?: DavPropertyValue[] } & DAVRequestOptions = {}) {
      const path = '/spaces/'

      const { results } = await dav.report(path, {
        pattern: 'is:favorite',
        properties: davProperties,
        ...opts
      })

      return results
    }
  }
}
