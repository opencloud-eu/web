import { Cache } from '../helpers/cache'

const filePreviewCache = new Cache<
  string,
  {
    etag?: string
    src?: string
    dimensions?: [number, number]
  }
>({ ttl: 10 * 1000, capacity: 250 })

class CacheService {
  public get filePreview() {
    return filePreviewCache
  }
}

export const cacheService = new CacheService()
