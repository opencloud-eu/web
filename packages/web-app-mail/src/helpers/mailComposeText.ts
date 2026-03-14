import DOMPurify from 'dompurify'

const replaceNbsp = (value: string) => {
  return (value ?? '').replace(/&nbsp;|&#160;/gi, ' ').replace(/\u00A0/g, ' ')
}

export const plainTextFromHtml = (input: string) => {
  if (!input) {
    return ''
  }

  return replaceNbsp(DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }))
}
