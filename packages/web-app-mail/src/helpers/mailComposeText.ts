import DOMPurify from 'dompurify'

const normalizeWhitespace = (value: string) => {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

export const plainTextForChangeCheck = (html: string) => {
  const raw = html ?? ''
  if (!raw) {
    return ''
  }

  if (!raw.includes('<')) {
    return normalizeWhitespace(raw)
  }

  const withoutTags = raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\u00A0/g, ' ')

  return normalizeWhitespace(withoutTags)
}

export const plainTextForSave = (html: string) => {
  const raw = html ?? ''
  if (!raw) {
    return ''
  }

  if (!raw.includes('<')) {
    return normalizeWhitespace(raw)
  }

  const stripped = DOMPurify.sanitize(raw, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
  return normalizeWhitespace(stripped)
}
