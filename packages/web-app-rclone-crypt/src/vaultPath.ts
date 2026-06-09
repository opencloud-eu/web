// Identify the vault root from a clear-text path: the first segment ending
// in `.vault` marks the root. Anything outside such a segment is not a
// vault from this plugin's point of view.
export function findVaultRoot(path: string | undefined): string | null {
  if (!path) return null
  const segments = path.split('/').filter(Boolean)
  const idx = segments.findIndex((s) => s.endsWith('.vault'))
  if (idx === -1) {
    return null
  }
  return '/' + segments.slice(0, idx + 1).join('/')
}
