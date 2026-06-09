import { unref } from 'vue'
import { extractExtensionFromFile, Resource, SpaceResource } from '@opencloud-eu/web-client'
import { DavPermission } from '@opencloud-eu/web-client/webdav'
import { mimeTypeForExtension } from './vaultMimeType'
import { decryptVaultPath, encryptVaultPath } from './vaultEngine'
import {
  ExtensionRegistry,
  FolderVaultClaim,
  FolderVaultEngine,
  FolderVaultExtension
} from '../composables/piniaStores/extensionRegistry'

/**
 * Walks the registered folder-vault extensions and returns the first engine
 * that can decrypt the given (space, path), or `null` if there is none. There
 * is no separate locked/unlocked vault state: an engine exists for a path
 * exactly when one was resolved and stashed in the store this session, and its
 * absence is all "locked" means. `null` therefore covers two cases that
 * callers usually treat the same:
 *
 *   - no extension claims the path (it isn't inside a vault at all), or
 *   - an extension claims it but no engine has been resolved for it yet.
 *
 * Use `getVaultClaim` to disambiguate when the difference matters - e.g.
 * the route guard needs the claim's unlock route, while everyone else can
 * safely treat both cases as "operate in cleartext".
 *
 * Since the vault-aware webdav decorator (`createVaultWebDav`), most callers
 * no longer resolve the engine themselves - the decorator does it for every
 * path-carrying webdav method. The remaining direct callers are exactly the
 * paths that can't route through that webdav client: the uppy/tus upload
 * pipeline, the delete worker, the version-download `getFileUrl` branch and
 * the activity feed. The route guard also calls in, but for unlock state to
 * drive a redirect, not for translation.
 */
export async function resolveFolderVault(
  extensionRegistry: ExtensionRegistry,
  space: SpaceResource,
  path: string | undefined
): Promise<FolderVaultEngine | null> {
  if (!space || !path) {
    return null
  }
  const extensions = unref(extensionRegistry.extensions)
    .flatMap((ref) => unref(ref))
    .filter((e): e is FolderVaultExtension => e.type === 'folderVault')
  for (const ext of extensions) {
    const engine = await ext.resolve(space, path)
    if (engine) {
      return engine
    }
  }
  return null
}

/**
 * Translate each resource's (possibly decrypted) path back to its on-server
 * encrypted form. For callers that bypass the vault-aware webdav client - the
 * web workers, which run their own vanilla webdav instance and would otherwise
 * write a cleartext name to the server for an unlocked vault. Resources outside
 * a vault (or in a locked one, where the path is already ciphertext) are
 * returned unchanged; the original instances stay untouched for UI state.
 */
export async function encryptResourcePathsForServer(
  extensionRegistry: ExtensionRegistry,
  space: SpaceResource,
  resources: Resource[]
): Promise<Resource[]> {
  return Promise.all(
    resources.map(async (r) => {
      const engine = await resolveFolderVault(extensionRegistry, space, r.path)
      if (!engine) return r
      const encryptedPath = await encryptVaultPath(engine, r.path)
      if (encryptedPath === r.path) return r
      return { ...r, path: encryptedPath } as Resource
    })
  )
}

/**
 * Same as `encryptResourcePathsForServer` but for bare folder paths (e.g. the
 * parent folders a restore has to recreate before moving the item back).
 */
export async function encryptFolderPathsForServer(
  extensionRegistry: ExtensionRegistry,
  space: SpaceResource,
  paths: string[]
): Promise<string[]> {
  return Promise.all(
    paths.map(async (p) => {
      const engine = await resolveFolderVault(extensionRegistry, space, p)
      return engine ? encryptVaultPath(engine, p) : p
    })
  )
}

/**
 * Walks the registered folder-vault extensions and returns the first one
 * that claims the given (space, path) - independent of unlock state. Callers
 * use this to decide whether to render an "unlock first" redirect for a
 * vault whose `resolve()` returned null (i.e. the extension owns the path
 * but currently can't produce an engine).
 *
 * Also the canonical "is this path inside any vault?" check - used by
 * `markVaultStatus` to populate `Resource.isInVault`.
 */
export function getVaultClaim(
  extensionRegistry: ExtensionRegistry,
  space: SpaceResource,
  path: string | undefined
): FolderVaultClaim | null {
  if (!space || !path) {
    return null
  }
  const extensions = unref(extensionRegistry.extensions)
    .flatMap((ref) => unref(ref))
    .filter((e): e is FolderVaultExtension => e.type === 'folderVault')
  for (const ext of extensions) {
    const claim = ext.claimsPath(space, path)
    if (claim) {
      return claim
    }
  }
  return null
}

/**
 * Rewrite a Resource so its name / path / webDavPath / extension reflect the
 * cleartext form. The server only knows the encrypted blob name, so anything
 * that surfaces a name in the UI (file lists, app top bar, side bar, browser
 * tab title) needs this to read like the user expects.
 */
export async function decryptResourceInPlace(
  engine: FolderVaultEngine,
  r: Resource | undefined | null
): Promise<Resource | undefined | null> {
  if (!r?.path) {
    return r
  }
  let decryptedPath: string
  try {
    decryptedPath = await decryptVaultPath(engine, r.path)
  } catch (e) {
    // A single foreign or corrupt blob (a file put there by another tool, a
    // truncated name, …) must not blow up the whole listing via the caller's
    // Promise.all. Keep its encrypted name but still flag it as in-vault so the
    // folder still loads. Share-gating (stripping Shareable) is applied by the
    // `markVaultStatus` pass that always follows this decrypt.
    console.error('[folder-vault] failed to decrypt resource path', r.path, e)
    r.isInVault = true
    return r
  }
  if (decryptedPath === r.path) {
    return r
  }
  const segments = decryptedPath.split('/').filter(Boolean)
  const encryptedSuffix = r.path
  r.path = decryptedPath
  r.name = segments[segments.length - 1] ?? r.name
  if (r.webDavPath && r.webDavPath.endsWith(encryptedSuffix)) {
    // webDavPath has shape /<dav-root>/<space>/<path>. Swap the encrypted
    // suffix for the decrypted one without parsing the dav-root prefix.
    r.webDavPath =
      r.webDavPath.slice(0, r.webDavPath.length - encryptedSuffix.length) + decryptedPath
  }
  // Re-derive the file extension from the cleartext name. The server only
  // knows the encrypted blob name (no extension), so editor/app pickers
  // would otherwise not match anything.
  if (r.type !== 'folder' && !r.isFolder) {
    r.extension = extractExtensionFromFile(r)
    // The server reports the *ciphertext* mime-type for the encrypted blob
    // (typically application/octet-stream). Preview/media apps usually
    // gate on mimeType in addition to extension, so override it with a
    // guess derived from the cleartext extension. Keeps preview, audio
    // and image apps happy.
    const guessed = mimeTypeForExtension(r.extension)
    if (guessed) {
      r.mimeType = guessed
    }
  }
  // The engine resolved → resource is by definition inside (or *is*) a vault.
  // Flagging covers in-vault listings; share-gating (Shareable strip) and
  // vault-root resources surfaced in a *parent* listing are handled by the
  // `markVaultStatus` pass that always follows this decrypt.
  r.isInVault = true
  return r
}

/**
 * Mark resources whose path sits inside (or *is*) a registered vault by
 * setting `Resource.isInVault = true`. Cheap path-based lookup via
 * `getVaultClaim` - no unlock state required.
 *
 * Call this on any listing the UI will render so action guards (move,
 * copy, paste, favorite, share-from-vault, …) can short-circuit on the
 * flag instead of re-parsing each resource's path themselves. Safe to
 * call after `decryptResourceInPlace` (idempotent).
 */
export function markVaultStatus(
  extensionRegistry: ExtensionRegistry,
  space: SpaceResource,
  resources: Array<Resource | undefined | null>
): void {
  if (!space || !resources?.length) return
  for (const r of resources) {
    if (!r?.path) continue
    const claim = getVaultClaim(extensionRegistry, space, r.path)
    if (!claim) continue
    // Guard the `.vault`-suffix detection band-aid: a *file* literally named
    // `something.vault` would otherwise be mistaken for a vault root. A real
    // vault root is always a folder, so a non-folder sitting exactly at the
    // claimed root is a false positive - leave it as a normal resource.
    if (claim.vaultRoot === r.path && r.type !== 'folder' && !r.isFolder) continue
    r.isInVault = true

    // All vault share-gating lives here. Vault *content* (anything below the
    // root) is never shareable: its ciphertext name can't be claimed once a
    // share or public link rebases the path, so strip Shareable and canShare()
    // returns false at every share entry point. The vault *root* keeps Shareable
    // on purpose - it stays collaborator-shareable (the recipient unlocks it out
    // of band, where the cleartext `.vault` name still anchors detection); only
    // public links are blocked, gated on `isInVault` in the link UI.
    if (claim.vaultRoot !== r.path && r.permissions) {
      r.permissions = r.permissions.replace(DavPermission.Shareable, '')
    }
  }
}
