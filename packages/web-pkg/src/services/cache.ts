import { Cache } from '../helpers/cache'

type FilePreviewCacheValue = {
  etag?: string
  src?: string
  dimensions?: [number, number]
}

const revokePreview = ({
  replacedValue,
  value
}: {
  replacedValue: FilePreviewCacheValue
  value?: FilePreviewCacheValue
}) => {
  const { src } = replacedValue
  if (src?.startsWith('blob:') && src !== value?.src) {
    window.URL.revokeObjectURL(src)
  }
}

const filePreviewCache = new Cache<string, FilePreviewCacheValue>({
  ttl: 10 * 1000,
  capacity: 250,
  onEvict: revokePreview
})

class CacheService {
  public get filePreview() {
    return filePreviewCache
  }
}

export const cacheService = new CacheService()
