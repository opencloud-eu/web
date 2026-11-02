const STORAGE_KEY_PREFIX = 'oc_epubReader_resource_'

type StoredReadingPosition = {
  cfi?: string
  /** Shape written by earlier versions of the reader. */
  currentLocation?: { start?: { cfi?: string } }
}

export function loadReadingPosition(resourceId: string): string | undefined {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY_PREFIX + resourceId)
    if (!stored) {
      return undefined
    }
    const data = JSON.parse(stored) as StoredReadingPosition
    return data.cfi || data.currentLocation?.start?.cfi
  } catch {
    return undefined
  }
}

export function saveReadingPosition(resourceId: string, cfi: string) {
  window.localStorage.setItem(STORAGE_KEY_PREFIX + resourceId, JSON.stringify({ cfi }))
}
