import { getLocaleFromLanguage } from './locale'

const collators = new Map<string, Intl.Collator>()

function getCollator(locale: string) {
  if (!collators.has(locale)) {
    collators.set(
      locale,
      new Intl.Collator(locale || undefined, { sensitivity: 'base', numeric: true })
    )
  }
  return collators.get(locale)
}

/**
 * Sorts tags for display: locale-aware, case-insensitive and numeric (natural number order),
 * with a byte-order fallback so equal-comparing tags keep a fixed order.
 */
export function sortTags(tags: string[], language: string): string[] {
  if (tags.length < 2) {
    return [...tags]
  }

  const collator = getCollator(getLocaleFromLanguage(language))
  return [...tags].sort((a, b) => collator.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0))
}
