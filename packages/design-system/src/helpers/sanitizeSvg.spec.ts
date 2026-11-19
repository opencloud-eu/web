import { sanitizeSvg } from './sanitizeSvg'

// parses the markup the same way vue-inline-svg does
function parseSvg(markup: string) {
  return new DOMParser()
    .parseFromString(markup, 'text/xml')
    .getElementsByTagName('svg')[0] as unknown as SVGElement
}

describe('sanitizeSvg', () => {
  it('removes event handlers from the root element', () => {
    const svg = sanitizeSvg(
      parseSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" onload="alert(1)" />')
    )
    expect(svg.hasAttribute('onload')).toBe(false)
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24')
  })

  it('removes event handlers from child elements', () => {
    const svg = sanitizeSvg(
      parseSvg(
        '<svg xmlns="http://www.w3.org/2000/svg">' +
          '<image href="data:," onerror="alert(1)" />' +
          '<path d="M0 0h24v24H0z" onclick="alert(1)" />' +
          '</svg>'
      )
    )
    expect(svg.querySelector('[onerror]')).toBeNull()
    expect(svg.querySelector('[onclick]')).toBeNull()
    expect(svg.querySelector('path').getAttribute('d')).toBe('M0 0h24v24H0z')
  })

  it('removes script elements', () => {
    const svg = sanitizeSvg(
      parseSvg('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><path /></svg>')
    )
    expect(svg.getElementsByTagName('script')).toHaveLength(0)
    expect(svg.getElementsByTagName('path')).toHaveLength(1)
  })

  it('removes javascript urls', () => {
    const svg = sanitizeSvg(
      parseSvg(
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
          '<a href="javascript:alert(1)"><path /></a>' +
          '<a xlink:href="javascript:alert(1)"><path /></a>' +
          '</svg>'
      )
    )
    expect(svg.innerHTML).not.toContain('javascript:')
  })

  it('keeps the markup of a regular icon', () => {
    const markup =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="img" aria-label="Icon" class="icon">' +
      '<defs>' +
      '<linearGradient id="gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" /></linearGradient>' +
      '<clipPath id="clip"><rect width="24" height="24" rx="2" /></clipPath>' +
      '<filter id="shadow"><feGaussianBlur stdDeviation="1" /></filter>' +
      '</defs>' +
      '<g clip-path="url(#clip)" filter="url(#shadow)">' +
      '<path class="background-splash" fill="url(#gradient)" fill-rule="evenodd" d="M0 0h24v24H0z" />' +
      '</g>' +
      '</svg>'
    const expected = parseSvg(markup).outerHTML

    expect(sanitizeSvg(parseSvg(markup)).outerHTML).toBe(expected)
  })

  it('removes style elements', () => {
    const svg = sanitizeSvg(
      parseSvg(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
          '<style>body { display: none }</style>' +
          '<path d="M0 0h24v24H0z" style="fill: red" />' +
          '</svg>'
      )
    )
    expect(svg.getElementsByTagName('style')).toHaveLength(0)
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24')
    expect(svg.querySelector('path').getAttribute('d')).toBe('M0 0h24v24H0z')
    expect(svg.querySelector('path').getAttribute('style')).toBe('fill: red')
  })

  it('returns an empty svg element if the svg cannot be sanitized', () => {
    const element = parseSvg('<svg onload="alert(1)" viewBox="0 0 24 24"><path d="M0 0" /></svg>')

    const svg = sanitizeSvg(element)

    expectEmptySvg(svg, element)
  })

  describe('if the svg cannot be sanitized in place', () => {
    afterEach(() => {
      vi.doUnmock('dompurify')
      vi.resetModules()
    })

    it('returns an empty svg element if DOMPurify is not supported', async () => {
      const sanitize = vi.fn((dirty: Node) => dirty)
      const sanitizeWithMock = await importWithDOMPurifyMock({ isSupported: false, sanitize })
      const element = parseSvg('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)" />')

      const svg = sanitizeWithMock(element)

      expectEmptySvg(svg, element)
      expect(sanitize).not.toHaveBeenCalled()
    })

    it('returns an empty svg element if DOMPurify does not return the element', async () => {
      const sanitizeWithMock = await importWithDOMPurifyMock({
        isSupported: true,
        sanitize: () => '<svg></svg>'
      })
      const element = parseSvg('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)" />')

      const svg = sanitizeWithMock(element)

      expectEmptySvg(svg, element)
    })
  })
})

function expectEmptySvg(svg: SVGElement, original: SVGElement) {
  expect(svg).not.toBe(original)
  expect(svg.tagName).toBe('svg')
  expect(svg.childNodes).toHaveLength(0)
  expect(svg.attributes).toHaveLength(0)
}

async function importWithDOMPurifyMock(purify: {
  isSupported: boolean
  sanitize: (dirty: Node) => Node | string
}) {
  vi.resetModules()
  vi.doMock('dompurify', () => ({ default: () => ({ ...purify, setConfig: vi.fn() }) }))
  const { sanitizeSvg: sanitizeWithMock } = await import('./sanitizeSvg')
  return sanitizeWithMock
}
