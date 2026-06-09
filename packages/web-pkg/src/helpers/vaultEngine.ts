import { urlJoin } from '@opencloud-eu/web-client'
import { FolderVaultEngine } from '../composables/piniaStores/extensionRegistry'

// A vault path comes in two forms:
//   full      `/my.vault/notes/q1.txt`  - what callers pass around
//   relative  `notes/q1.txt`            - the part inside the vault; all the engine sees
//
// full -> relative: drop the vault root and the leading slash. Slicing
// `vaultRoot.length` covers both a folder root and the share root `/` - for `/`
// the single character it drops IS the leading slash:
//   `/my.vault` + `/my.vault/notes/q1.txt` -> `notes/q1.txt`
//   `/`         + `/notes/q1.txt`          -> `notes/q1.txt`
function stripVaultRoot(vaultRoot: string, fullPath: string): string {
  return fullPath.slice(vaultRoot.length).replace(/^\/+/, '').replace(/\/+$/, '')
}

// relative -> full is just `urlJoin(vaultRoot, relative)` - it joins
// `/my.vault` + `enc` -> `/my.vault/enc` and `/` + `enc` -> `/enc` (no `//`).

/**
 * Encrypt a full clear-text path: drop the vault root, encrypt the relative
 * remainder (the only part the engine handles), then join the root back on -
 *   `/my.vault/notes/q1.txt` -> `/my.vault/<enc notes>/<enc q1.txt>`.
 * The vault root itself is clear text on the server, so it is returned unchanged
 * (the engine isn't called).
 */
export async function encryptVaultPath(
  engine: FolderVaultEngine,
  fullPath: string
): Promise<string> {
  const relative = stripVaultRoot(engine.vaultRoot, fullPath)
  if (!relative) {
    return engine.vaultRoot
  }
  return urlJoin(engine.vaultRoot, await engine.encryptPath(relative), { leadingSlash: true })
}

/**
 * The exact inverse of encryptVaultPath -
 *   `/my.vault/<enc notes>/<enc q1.txt>` -> `/my.vault/notes/q1.txt`.
 */
export async function decryptVaultPath(
  engine: FolderVaultEngine,
  fullPath: string
): Promise<string> {
  const relative = stripVaultRoot(engine.vaultRoot, fullPath)
  if (!relative) {
    return engine.vaultRoot
  }
  return urlJoin(engine.vaultRoot, await engine.decryptPath(relative), { leadingSlash: true })
}
