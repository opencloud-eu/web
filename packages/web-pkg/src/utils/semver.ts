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
