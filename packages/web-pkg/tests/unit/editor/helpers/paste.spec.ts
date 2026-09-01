import { describe, expect, it } from 'vitest'
import { stripColorFormattingFromPastedHtml } from '../../../../src/editor/helpers/paste'

describe('stripColorFormattingFromPastedHtml', () => {
  it('removes color and background-color styles but keeps other styles', () => {
    const transformedHtml = stripColorFormattingFromPastedHtml(
      '<p><span style="color: #ff0000; background-color: #ffff00; font-weight: 700;">Styled</span></p>'
    )
    const parsedHtml = new DOMParser().parseFromString(transformedHtml, 'text/html')
    const span = parsedHtml.body.querySelector('span')

    expect(span?.getAttribute('style')).toContain('font-weight')
    expect(span?.style.color).toBe('')
    expect(span?.style.backgroundColor).toBe('')
  })

  it('removes style attribute when only color styles were present', () => {
    const transformedHtml = stripColorFormattingFromPastedHtml(
      '<p><span style="color: #ff0000; background-color: #ffff00;">Styled</span></p>'
    )
    const parsedHtml = new DOMParser().parseFromString(transformedHtml, 'text/html')
    const span = parsedHtml.body.querySelector('span')

    expect(span?.hasAttribute('style')).toBe(false)
  })

  it('removes deprecated color and bgcolor attributes', () => {
    const transformedHtml = stripColorFormattingFromPastedHtml(
      '<p><font color="#00ff00">Legacy</font><table><tr><td bgcolor="#0000ff">Cell</td></tr></table></p>'
    )
    const parsedHtml = new DOMParser().parseFromString(transformedHtml, 'text/html')

    expect(parsedHtml.body.querySelector('[color]')).toBeNull()
    expect(parsedHtml.body.querySelector('[bgcolor]')).toBeNull()
  })
})
