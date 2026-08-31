const STYLE_PROPERTIES_TO_REMOVE_ON_PASTE = ['color', 'background-color'] as const
const HTML_ATTRIBUTES_TO_REMOVE_ON_PASTE = ['color', 'bgcolor'] as const

export function stripColorFormattingFromPastedHtml(html: string): string {
  if (!html || typeof DOMParser === 'undefined') {
    return html
  }

  const parsedHtml = new DOMParser().parseFromString(html, 'text/html')
  const allElements = parsedHtml.body.querySelectorAll<HTMLElement>('*')

  allElements.forEach((element) => {
    if (element.hasAttribute('style')) {
      STYLE_PROPERTIES_TO_REMOVE_ON_PASTE.forEach((propertyName) => {
        element.style.removeProperty(propertyName)
      })

      if (!element.style.cssText.trim()) {
        element.removeAttribute('style')
      }
    }

    HTML_ATTRIBUTES_TO_REMOVE_ON_PASTE.forEach((attributeName) => {
      element.removeAttribute(attributeName)
    })
  })

  return parsedHtml.body.innerHTML
}
