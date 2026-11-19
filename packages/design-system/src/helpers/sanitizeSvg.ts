import DOMPurify, { type DOMPurify as DOMPurifyInstance } from 'dompurify'

let purify: DOMPurifyInstance | undefined

// A dedicated instance keeps the config and hooks of other DOMPurify users out of it. Setting the
// config once instead of passing it on every call makes sanitizing a lot faster, which matters
// because inlined SVGs get sanitized on every render.
function getPurify() {
  if (!purify) {
    purify = DOMPurify(window)
    purify.setConfig({
      IN_PLACE: true,
      USE_PROFILES: { svg: true, svgFilters: true },
      ADD_ATTR: ['role'],
      // the rules of an inlined style element would apply to the whole document
      FORBID_TAGS: ['style']
    })
  }
  return purify
}

function createEmptySvg() {
  return document.createElementNS('http://www.w3.org/2000/svg', 'svg')
}

/**
 * Sanitizes an SVG element in place, removing scripts, event handlers and other unsafe markup from
 * the element itself and its children. Returns an empty SVG element if it can't be sanitized.
 */
export function sanitizeSvg(svg: SVGElement): SVGElement {
  const instance = getPurify()
  if (!instance.isSupported) {
    return createEmptySvg()
  }
  try {
    // only an element that got sanitized in place comes back as it is
    const result: unknown = instance.sanitize(svg)
    if (result !== svg) {
      return createEmptySvg()
    }
    return svg
  } catch {
    return createEmptySvg()
  }
}
