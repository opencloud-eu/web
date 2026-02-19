import DOMPurify from 'dompurify'

const replaceNbsp = (value: string) => {
  return (value ?? '').replace(/&nbsp;|&#160;/gi, ' ').replace(/\u00A0/g, ' ')
}

const toPlainText = (input: string) => {
  const value = input ?? ''
  if (!value) {
    return ''
  }

  const stripped = DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
  return replaceNbsp(stripped)
}

export const plainTextForSave = (html: string) => toPlainText(html)

export const plainTextForChangeCheck = (html: string) => toPlainText(html)
