/** Whether the link leads to a web page, not e.g. to an email (mailto:) or a phone (tel:). */
export function isWebUrl(url: string) {
  return /^https?:/i.test(url)
}
