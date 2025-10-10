import { compareVersions, parseVersion } from '../../../src/utils/semver'

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
