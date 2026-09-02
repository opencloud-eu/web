import { deterministicColor, hslToHex } from '../../../src/lib/color.ts'

describe('hslToHex', () => {
  it.each([
    [0, 1, 0.5, '#ff0000'],
    [120, 1, 0.5, '#00ff00'],
    [240, 1, 0.5, '#0000ff'],
    [0, 0, 0, '#000000'],
    [0, 0, 1, '#ffffff'],
    [0, 0, 0.5, '#808080']
  ])('maps hsl(%s, %s, %s) to %s', (h, s, l, expected) => {
    expect(hslToHex(h, s, l)).toBe(expected)
  })
})

describe('deterministicColor', () => {
  it('returns a 6 digit hex color', () => {
    expect(deterministicColor('alice')).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('returns the same color for the same seed', () => {
    expect(deterministicColor('alice')).toBe(deterministicColor('alice'))
  })

  it('returns different colors for different seeds', () => {
    expect(deterministicColor('alice')).not.toBe(deterministicColor('bob'))
  })

  it('handles an empty seed', () => {
    expect(deterministicColor('')).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('handles non-ascii seeds', () => {
    expect(deterministicColor('üöä-日本語')).toMatch(/^#[0-9a-f]{6}$/)
  })
})
