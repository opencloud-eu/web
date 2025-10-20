import { Mail, MailBodyPart } from '../types'
import DOMPurify from 'dompurify'

export const getPartIdsFromHtmlBody = (parts?: MailBodyPart[]): string[] => {
  if (!parts?.length) {
    return []
  }
  const partIds: string[] = []
  for (const p of parts) {
    if (p.partId) {
      partIds.push(p.partId)
    }
    if (p.subParts?.length) {
      partIds.push(...getPartIdsFromHtmlBody(p.subParts))
    }
  }
  return partIds
}

export const buildMailBody = (mail: Mail): string => {
  const values = mail.bodyValues ?? {}

  const htmlbody = getPartIdsFromHtmlBody(mail.htmlBody)
    .map((partId) => values[partId]?.value || '')
    .filter(Boolean)
    .join('')

  if (htmlbody) {
    return DOMPurify.sanitize(htmlbody, { USE_PROFILES: { html: true } })
  } else {
    const textbody = getPartIdsFromHtmlBody(mail.textBody)
      .map((partId) => values[partId]?.value || '')
      .filter(Boolean)
      .join('\n\n')
    return `<pre>${DOMPurify.sanitize(textbody, { USE_PROFILES: { html: true } })}</pre>`
  }
}
