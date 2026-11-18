export const parseVersion = (tag: string) => {
  const version = tag.startsWith('v') ? tag.slice(1) : tag
  const [main, pre] = version.split('-')
  const [major, minor, patch] = main.split('.').map(Number)
  return { major, minor, patch, pre }
}

/**
 * Compares two version strings.
 * Returns:
 * - negative number if a is less than b,
 * - positive number if a is greater than b,
 * - 0 if a and b are equal.
 */
export const compareVersions = (a: string, b: string) => {
  const va = parseVersion(a)
  const vb = parseVersion(b)

  if (va.major !== vb.major) {
    return va.major - vb.major
  }
  if (va.minor !== vb.minor) {
    return va.minor - vb.minor
  }
  if (va.patch !== vb.patch) {
    return va.patch - vb.patch
  }

  if (va.pre && !vb.pre) {
    return -1
  }
  if (!va.pre && vb.pre) {
    return 1
  }

  if (va.pre && vb.pre) {
    return va.pre.localeCompare(vb.pre)
  }

  return 0
}

const wildcards = ['x', 'X', '*']

/**
 * Bounds of a version range, by default including the lower and excluding the upper bound.
 * A missing bound is unbounded.
 */
interface VersionBounds {
  lower?: string
  lowerExclusive?: boolean
  upper?: string
  upperInclusive?: boolean
}

/**
 * Bounds of a (partial) version: `7.2.x` and `7.2` are >=7.2.0-0 <7.3.0-0, `7` is >=7.0.0-0 <8.0.0-0,
 * a full version is exactly that version and `*` has no bounds. The `-0` prerelease is the lowest
 * one, so the prereleases of 7.2.0 are in `7.2.x` and the ones of 7.3.0 are not.
 */
function getVersionBounds(partial: string): VersionBounds {
  const parts = (partial.startsWith('v') ? partial.slice(1) : partial).split('.')
  const firstWildcard = parts.findIndex((part) => wildcards.includes(part))
  const known = firstWildcard === -1 ? parts : parts.slice(0, firstWildcard)

  if (parts.length > 3 || known.some((part) => !/^\d+$/.test(part))) {
    throw new Error(`invalid version "${partial}"`)
  }
  if (known.length === 3) {
    return { lower: known.join('.'), upper: known.join('.'), upperInclusive: true }
  }
  if (!known.length) {
    return {}
  }

  const lower = [...known, '0', '0'].slice(0, 3)
  const upper = [...known.slice(0, -1), String(Number(known.at(-1)) + 1), '0', '0'].slice(0, 3)
  return { lower: `${lower.join('.')}-0`, upper: `${upper.join('.')}-0` }
}

function isWithinBounds(
  version: string,
  { lower, lowerExclusive, upper, upperInclusive }: VersionBounds
) {
  if (lower) {
    const comparison = compareVersions(version, lower)
    if (lowerExclusive ? comparison <= 0 : comparison < 0) {
      return false
    }
  }
  if (!upper) {
    return true
  }
  const comparison = compareVersions(version, upper)
  return upperInclusive ? comparison <= 0 : comparison < 0
}

function parseComparator(comparator: string): VersionBounds {
  const [, operator, partial] = comparator.match(/^(<=|>=|<|>|=)?(.+)$/)
  const bounds = getVersionBounds(partial)

  if ((operator === '<' || operator === '>') && !bounds.lower) {
    throw new Error(`invalid comparator "${comparator}"`)
  }

  switch (operator) {
    case '>=':
      return { lower: bounds.lower }
    case '>':
      return { lower: bounds.upper, lowerExclusive: bounds.upperInclusive }
    case '<':
      return { upper: bounds.lower }
    case '<=':
      return { upper: bounds.upper, upperInclusive: bounds.upperInclusive }
    default:
      return bounds
  }
}

function parseComparatorSet(set: string): VersionBounds[] {
  const hyphenRange = set.split(/\s+-\s+/)
  if (hyphenRange.length > 2) {
    throw new Error(`invalid version range "${set}"`)
  }
  if (hyphenRange.length === 2) {
    const { lower } = getVersionBounds(hyphenRange[0])
    const { upper, upperInclusive } = getVersionBounds(hyphenRange[1])
    return [{ lower, upper, upperInclusive }]
  }

  return set
    .replace(/(<=|>=|<|>|=)\s+/g, '$1')
    .split(/\s+/)
    .map(parseComparator)
}

function parseRange(range: string) {
  const sets = range.split('||').map((set) => set.trim())
  if (sets.some((set) => !set)) {
    throw new Error(`invalid version range "${range}"`)
  }
  return sets.map(parseComparatorSet)
}

/**
 * Checks whether a version is in a range, using a subset of the npm semver range syntax:
 * ranges joined with `||`, hyphen ranges (`1.0.0 - 3.0.0`, both ends inclusive), comparators
 * (`<`, `<=`, `>`, `>=`, `=`, joined by spaces) and wildcards (`7.2.x`, `7.x`, `*`).
 * A prerelease version is lower than its release (7.2.0-rc.1 is in `<7.2.0`), and partial or
 * wildcard bounds include prereleases like npm's `includePrerelease` option (7.2.0-rc.1 is in
 * `7.2.x`, 7.3.0-rc.1 is not).
 * Throws on a range it can't parse.
 */
export function satisfiesVersionRange(version: string, range: string) {
  return parseRange(range).some((set) => set.every((bounds) => isWithinBounds(version, bounds)))
}
