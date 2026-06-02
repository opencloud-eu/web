import { unref } from 'vue'
import { extractExtensionFromFile, Resource, SpaceResource } from '@opencloud-eu/web-client'
import { DavPermission } from '@opencloud-eu/web-client/webdav'
import {
  ExtensionRegistry,
  FolderVaultClaim,
  FolderVaultEngine,
  FolderVaultExtension
} from '../composables/piniaStores/extensionRegistry'

/**
 * Walks the registered folder-vault extensions and returns the first engine
 * that can decrypt the given (space, path) — i.e. a vault that is currently
 * **unlocked** in this session. Returns `null` in two distinct situations
 * that callers should usually treat the same:
 *
 *   - no extension owns the path (it isn't inside a vault at all), or
 *   - an extension owns the path but the vault is still locked (no secret
 *     in the store yet).
 *
 * Use `getVaultClaim` to disambiguate when the difference matters — e.g.
 * the route guard needs the unlock route, while everyone else can safely
 * treat both cases as "operate in cleartext".
 *
 * FIXME(poc-vault): this lookup currently lives next to the loaders and the
 * AppWrapper. Once we lift vault-aware translation onto a higher layer (e.g.
 * a webdav/client decorator or a folderService decorator), callers stop
 * needing to resolve the engine themselves.
 */
export function resolveFolderVault(
  extensionRegistry: ExtensionRegistry,
  space: SpaceResource,
  path: string | undefined
): FolderVaultEngine | null {
  if (!space || !path) {
    return null
  }
  const extensions = unref(extensionRegistry.extensions)
    .flatMap((ref) => unref(ref))
    .filter((e): e is FolderVaultExtension => e.type === 'folderVault')
  for (const ext of extensions) {
    const engine = ext.resolve(space, path)
    if (engine) {
      return engine
    }
  }
  return null
}

/**
 * Walks the registered folder-vault extensions and returns the first one
 * that claims the given (space, path) — independent of unlock state. Callers
 * use this to decide whether to render an "unlock first" redirect for a
 * vault whose `resolve()` returned null (i.e. the extension owns the path
 * but currently can't produce an engine).
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

// Tiny extension → mime-type lookup so vault resources show up with the
// right mime once we've recovered their cleartext extension. Mirrors the
// shapes the preview / mediaviewer / file-icon code checks against.
const MIME_BY_EXTENSION: Record<string, string> = {
  txt: 'text/plain',
  md: 'text/markdown',
  markdown: 'text/markdown',
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  csv: 'text/csv',
  json: 'application/json',
  xml: 'application/xml',
  yml: 'text/yaml',
  yaml: 'text/yaml',
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  flac: 'audio/flac',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  zip: 'application/zip',
  epub: 'application/epub+zip'
}

function guessMimeType(extension: string | undefined): string | undefined {
  if (!extension) return undefined
  return MIME_BY_EXTENSION[extension.toLowerCase()]
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
  const decryptedPath = await engine.decryptPath(r.path)
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
    const guessed = guessMimeType(r.extension)
    if (guessed) {
      r.mimeType = guessed
    }
  }
  // Sharing a vault entry would expose ciphertext blobs to other users with
  // no way to read them. Strip the Shareable permission so canShare()
  // returns false everywhere in the UI (action buttons, sidebar, etc.).
  if (r.permissions) {
    r.permissions = r.permissions.replace(DavPermission.Shareable, '')
  }
  return r
}
