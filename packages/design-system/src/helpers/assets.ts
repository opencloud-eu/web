/**
 * Adds version query parameter to asset URLs for cache busting
 */
export const addVersionToAssetUrl = (url: string): string => {
  const globalProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process
  const processVersion = globalProcess?.env?.PACKAGE_VERSION
  const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  const version = processVersion || viteEnv?.PACKAGE_VERSION

  if (!version) {
    return url
  }

  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}v=${version}`
}
