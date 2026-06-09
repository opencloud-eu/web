import { SpaceResource, isShareSpaceResource } from '@opencloud-eu/web-client'

// The single `.vault`-suffix heuristic both detection paths share, so they can't
// drift. This is the known band-aid until a per-user vault registry replaces it.
export function looksLikeVaultName(name: string | undefined): boolean {
  return !!name && name.endsWith('.vault')
}

// Identify the vault root from a clear-text path: the first segment ending
// in `.vault` marks the root. Anything outside such a segment is not a
// vault from this plugin's point of view.
export function findVaultRoot(path: string | undefined): string | null {
  if (!path) return null
  const segments = path.split('/').filter(Boolean)
  const idx = segments.findIndex((s) => looksLikeVaultName(s))
  if (idx === -1) {
    return null
  }
  return '/' + segments.slice(0, idx + 1).join('/')
}

// Resolve the vault root for a (space, path), considering the space - not just
// the path. Two cases:
//   1. The `.vault` segment is in the path (the owner browsing their vault, or a
//      vault nested under a shared normal folder): `findVaultRoot` wins.
//   2. The whole SPACE is the vault: a directly-shared vault, where the share
//      root *is* the `.vault` folder. The receiver's paths are rebased to the
//      share root, so the `.vault` marker only survives in `space.name` /
//      driveAlias, never in the path. Then the vault root is the space root `/`.
export function vaultRootForSpace(space: SpaceResource, path: string | undefined): string | null {
  const inPath = findVaultRoot(path)
  if (inPath) {
    return inPath
  }
  if (space && isShareSpaceResource(space) && looksLikeVaultName(space.name)) {
    return '/'
  }
  return null
}
