import { filesize } from 'filesize'
import { getLocaleFromLanguage } from './locale'
import { isRtlLanguage, isolateLtr } from '@opencloud-eu/design-system/helpers'

const mb = 1048576

// Returns formatted size
export const formatFileSize = (size: number | string, currentLanguage: string) => {
  const parsedSize = typeof size === 'string' ? parseInt(size) : size
  if (parsedSize < 0) {
    return '--'
  }

  if (isNaN(parsedSize)) {
    return '?'
  }

  const formatted = filesize(parsedSize, {
    round: parsedSize < mb ? 0 : 1,
    locale: getLocaleFromLanguage(currentLanguage),
    base: 10,
    output: 'string'
  })
  // "8.2 MB" would otherwise render as "MB 8.2" inside right-to-left text
  return isRtlLanguage(currentLanguage) ? isolateLtr(formatted) : formatted
}
