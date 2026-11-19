import DOMPurify, { type DOMPurify as DOMPurifyInstance } from 'dompurify'

let purify: DOMPurifyInstance | undefined

// own instance with the config set once, it runs on every render
function getPurify() {
  if (!purify) {
    purify = DOMPurify(window)
    purify.setConfig({
      IN_PLACE: true,
      USE_PROFILES: { svg: true, svgFilters: true },
      ADD_ATTR: ['role'],
      FORBID_TAGS: ['style']
    })
  }
  return purify
}

function createEmptySvg() {
  return document.createElementNS('http://www.w3.org/2000/svg', 'svg')
}

/** Sanitizes an SVG element in place, returns an empty SVG if that fails. */
export function sanitizeSvg(svg: SVGElement): SVGElement {
  const instance = getPurify()
  if (!instance.isSupported) {
    return createEmptySvg()
  }
  try {
    const result: unknown = instance.sanitize(svg)
    if (result !== svg) {
      return createEmptySvg()
    }
    return svg
  } catch {
    return createEmptySvg()
  }
}
