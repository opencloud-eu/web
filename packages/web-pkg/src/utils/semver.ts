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

interface VersionBounds {
  lower?: string
  upper?: string
  upperInclusive?: boolean
}

/**
 * Bounds of a (partial) version: `7.2.x` and `7.2` are >=7.2.0 <7.3.0, `7` is >=7.0.0 <8.0.0,
 * a full version is exactly that version and `*` has no bounds.
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
  return { lower: lower.join('.'), upper: upper.join('.'), upperInclusive: false }
}

function isWithinBounds(version: string, { lower, upper, upperInclusive }: VersionBounds) {
  if (lower && compareVersions(version, lower) < 0) {
    return false
  }
  if (!upper) {
    return true
  }
  const comparison = compareVersions(version, upper)
  return upperInclusive ? comparison <= 0 : comparison < 0
}

function satisfiesComparator(version: string, comparator: string) {
  const [, operator, partial] = comparator.match(/^(<=|>=|<|>|=)?(.+)$/)
  const bounds = getVersionBounds(partial)

  switch (operator) {
    case '>=':
      return isWithinBounds(version, { lower: bounds.lower })
    case '>':
      if (!bounds.upper) {
        return false
      }
      return bounds.upperInclusive
        ? compareVersions(version, bounds.upper) > 0
        : compareVersions(version, bounds.upper) >= 0
    case '<':
      return bounds.lower ? compareVersions(version, bounds.lower) < 0 : false
    case '<=':
      return isWithinBounds(version, { upper: bounds.upper, upperInclusive: bounds.upperInclusive })
    default:
      return isWithinBounds(version, bounds)
  }
}

function satisfiesComparatorSet(version: string, set: string) {
  const hyphenRange = set.split(/\s+-\s+/)
  if (hyphenRange.length === 2) {
    const { lower } = getVersionBounds(hyphenRange[0])
    const { upper, upperInclusive } = getVersionBounds(hyphenRange[1])
    return isWithinBounds(version, { lower, upper, upperInclusive })
  }
  if (hyphenRange.length > 2) {
    throw new Error(`invalid version range "${set}"`)
  }

  return set
    .replace(/(<=|>=|<|>|=)\s+/g, '$1')
    .split(/\s+/)
    .every((comparator) => satisfiesComparator(version, comparator))
}

/**
 * Checks whether a version is in a range, using a subset of the npm semver range syntax:
 * ranges joined with `||`, hyphen ranges (`1.0.0 - 3.0.0`, both ends inclusive), comparators
 * (`<`, `<=`, `>`, `>=`, `=`, joined by spaces) and wildcards (`7.2.x`, `7.x`, `*`).
 * Throws on a range it can't parse.
 */
export function satisfiesVersionRange(version: string, range: string) {
  const sets = range.split('||').map((set) => set.trim())
  if (sets.some((set) => !set)) {
    throw new Error(`invalid version range "${range}"`)
  }
  return sets.some((set) => satisfiesComparatorSet(version, set))
}
