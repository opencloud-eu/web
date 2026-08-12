// Vite injects this at build time
declare const process: { env: { PACKAGE_VERSION?: string } }

/**
 * Adds version query parameter to asset URLs for cache busting
 */
export const addVersionToAssetUrl = (url: string): string => {
  const version = process.env.PACKAGE_VERSION
  if (!version) {
    return url
  }

  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}v=${version}`
}
