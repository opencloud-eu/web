// Vite injects this at build time
declare const process: { env: { PACKAGE_VERSION?: string } }

function getPackageVersion(): string | undefined {
  try {
    return process.env.PACKAGE_VERSION
  } catch {
    // `process` doesn't exist in the browser if the bundler doesn't inject the version (e.g. in the docs)
    return undefined
  }
}

/**
 * Adds version query parameter to asset URLs for cache busting
 */
export const addVersionToAssetUrl = (url: string): string => {
  const version = getPackageVersion()
  if (!version) {
    return url
  }

  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}v=${version}`
}
