import { Cache } from '../helpers/cache'

type FilePreviewCacheValue = {
  etag?: string
  src?: string
  dimensions?: [number, number]
  size?: number
}

/**
 * Budget for cached previews. Sized to hold several folders worth of tile previews
 * so navigating back does not re-fetch; table thumbnails are nearly free.
 */
const previewBudget = 150 * 1024 * 1024 // 150 MB

/**
 * Entries without a known blob size still need to count towards the budget,
 * otherwise they could grow it without bound.
 */
const fallbackPreviewSize = 100 * 1024 // 100 KB

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
  maxBytes: previewBudget,
  sizeOf: ({ size }) => size || fallbackPreviewSize,
  onEvict: revokePreview
})

class CacheService {
  public get filePreview() {
    return filePreviewCache
  }
}

export const cacheService = new CacheService()
