import { Cache } from '../helpers/cache'

type FilePreviewCacheValue = {
  etag?: string
  src?: string
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

/** Build a cache key for a file, including its dimensions if provided. */
export function buildFilePreviewCacheKey(
  resourceId: string,
  dimensions?: [number, number]
): string {
  return `${resourceId}@${dimensions?.join('x') ?? ''}`
}

const filePreviewCache = new Cache<string, FilePreviewCacheValue>({
  maxBytes: previewBudget,
  sizeOf: ({ size }) => size || fallbackPreviewSize,
  onEvict: revokePreview
})

/** Releases all cached previews of a resource. */
export function releaseFilePreviews(resourceIds: string[]): void {
  const ids = new Set(resourceIds)
  for (const key of filePreviewCache.keys()) {
    if (ids.has(key.slice(0, key.indexOf('@')))) {
      filePreviewCache.delete(key)
    }
  }
}

class CacheService {
  public get filePreview() {
    return filePreviewCache
  }
}

export const cacheService = new CacheService()
