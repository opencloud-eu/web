import { compareVersions, parseVersion, satisfiesVersionRange } from '../../../src/utils/semver'

describe('parseVersion', () => {
  it('parses version strings correctly', () => {
    const version = parseVersion('v1.2.3-beta')
    expect(version).toEqual({ major: 1, minor: 2, patch: 3, pre: 'beta' })
  })
})

describe('compareVersions', () => {
  it.each([
    ['v1.2.3', 'v1.2.4', -1],
    ['v1.2.4', 'v1.2.3', 1],
    ['v1.2.3', 'v1.2.3', 0]
  ])('compares version strings correctly', (a, b, expected) => {
    const result = compareVersions(a, b)
    expect(result).toBe(expected)
  })
})

describe('satisfiesVersionRange', () => {
  it.each([
    ['2.0.0', '1.0.0 - 3.0.0', true],
    ['1.0.0', '1.0.0 - 3.0.0', true],
    ['3.0.0', '1.0.0 - 3.0.0', true],
    ['3.0.1', '1.0.0 - 3.0.0', false],
    ['0.9.9', '1.0.0 - 3.0.0', false],
    ['4.0.0', '1.0.0 - 3.0.0 || 5.0.0 - 7.0.0', false],
    ['6.1.0', '1.0.0 - 3.0.0 || 5.0.0 - 7.0.0', true],
    ['7.2.9', '7.0.0 - 7.2', true],
    ['7.3.0', '7.0.0 - 7.2', false],
    ['7.2.4', '>=7.2.0 <=7.2.5', true],
    ['7.2.6', '>=7.2.0 <=7.2.5', false],
    ['7.2.6', '>= 7.2.0 < 7.3.0', true],
    ['7.3.0', '>= 7.2.0 < 7.3.0', false],
    ['9.1.0', '<9.1.1', true],
    ['9.1.1', '<9.1.1', false],
    ['9.2.0', '>9.1', true],
    ['9.1.5', '>9.1', false],
    ['6.2.0', '6.2.0 || 7.0.0 - 9.1.0', true],
    ['6.3.0', '6.2.0 || 7.0.0 - 9.1.0', false],
    ['7.2.3', '7.2.x', true],
    ['7.3.0', '7.2.x', false],
    ['7.9.0', '7.x', true],
    ['8.0.0', '=7', false],
    ['1.2.3', '*', true],
    ['v7.2.1', 'v7.2.0 - v7.2.5', true],
    ['9.1.0-rc.1', '<9.1.0', true]
  ])('%s in "%s" is %s', (version, range, expected) => {
    expect(satisfiesVersionRange(version, range)).toBe(expected)
  })

  it.each(['', '1.0.0 ||', '^1.0.0', '~1.2', '1.0.0 - 2.0.0 - 3.0.0', 'abc', '1.2.3.4', '>='])(
    'throws on the unsupported range "%s"',
    (range) => {
      expect(() => satisfiesVersionRange('1.0.0', range)).toThrow()
    }
  )

  it.each([
    ['2.0.0', '1.0.0 -3.0.0'],
    ['2.0.0', '1.0.0 | 2.0.0'],
    ['7.2.5', '7.2.5 ||| 1.0.0'],
    ['7.1.0', '>=7.2.0 ~7.2.5']
  ])('throws for %s on the invalid range "%s"', (version, range) => {
    expect(() => satisfiesVersionRange(version, range)).toThrow()
  })
})
