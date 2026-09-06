import { Resource, SpaceResource } from '@opencloud-eu/web-client'
import { decryptResourceInPlace, getVaultClaim, markVaultStatus, resolveVaultEngine } from './vault'
import { encryptVaultPath } from './vaultEngine'
import { ExtensionRegistry } from '../composables/piniaStores/extensionRegistry'

/**
 * Vault translation between what the user sees and what the server stores,
 * independent of the client that carries the request. The webdav decorator
 * (`createVaultWebDav`) and the graph folder listing both translate through
 * these, so a vault behaves the same no matter which API served the listing.
 */

/**
 * Encrypt a clear-text path into its server-side form. No-op (sync fast path)
 * when the path isn't claimed by any vault. For a *locked* vault we have no
 * key, so we leave the path untouched - mutations on a locked vault aren't
 * reachable through the UI (the unlock gate stops them first).
 */
export async function toVaultServerPath(
  extensionRegistry: ExtensionRegistry,
  space: SpaceResource,
  path: string | undefined
): Promise<string | undefined> {
  if (!space || !path) {
    return path
  }
  if (!getVaultClaim(extensionRegistry, space, path)) {
    return path
  }
  const engine = await resolveVaultEngine(extensionRegistry, space, path)
  return engine ? await encryptVaultPath(engine, path) : path
}

/**
 * Like `toVaultServerPath`, but for *writes*: refuse to operate when the path
 * belongs to a vault that is locked. Reads can fall through and just show
 * ciphertext, but a write (create / put / move / copy / delete) with the
 * untranslated clear-text path would put a clear-text name on the server and
 * corrupt the vault. The UI never reaches a locked vault, so this only ever
 * fires as a fail-closed backstop - never silently send clear text.
 */
export async function toVaultServerPathForWrite(
  extensionRegistry: ExtensionRegistry,
  space: SpaceResource,
  path: string | undefined
): Promise<string | undefined> {
  if (!space || !path) {
    return path
  }
  const claim = getVaultClaim(extensionRegistry, space, path)
  if (!claim) {
    return path
  }
  // The vault *root* itself is a clear-text folder name - creating, renaming
  // or deleting the vault needs no key, so let it through untouched even when
  // no engine exists (e.g. while creating the vault, or for a locked one).
  // Only *content* below the root carries an encryptable name.
  if (claim.vaultRoot === path) {
    return path
  }
  const engine = await resolveVaultEngine(extensionRegistry, space, path)
  if (!engine) {
    throw new Error(
      `Refusing to write a clear-text path into the locked vault "${claim.vaultRoot}"`
    )
  }
  return encryptVaultPath(engine, path)
}

/**
 * Decrypt the names of resources coming back from the server and flag their
 * vault status. Resources are grouped by vault root so a mixed listing (e.g.
 * the trash bin, where each item's original location may sit in a different
 * vault) resolves each engine exactly once. `markVaultStatus` is claim-based
 * and runs even while a vault is locked; the actual name decrypt only happens
 * when the vault is unlocked (the engine resolves).
 */
export async function applyVaultFromServer(
  extensionRegistry: ExtensionRegistry,
  space: SpaceResource,
  resources: Array<Resource | undefined | null>
): Promise<void> {
  const list = resources.filter((r): r is Resource => !!r?.path)
  if (!space || !list.length) {
    return
  }

  const byRoot = new Map<string, Resource[]>()
  for (const r of list) {
    const claim = getVaultClaim(extensionRegistry, space, r.path)
    if (!claim) {
      continue
    }
    const group = byRoot.get(claim.vaultRoot) ?? []
    group.push(r)
    byRoot.set(claim.vaultRoot, group)
  }

  for (const [vaultRoot, group] of byRoot) {
    const engine = await resolveVaultEngine(extensionRegistry, space, vaultRoot)
    if (engine) {
      await Promise.all(group.map((r) => decryptResourceInPlace(engine, r)))
    }
  }

  // Always (re-)flag vault status. Idempotent after decryptResourceInPlace, and
  // the only thing that fires for a locked vault or for a vault root surfaced
  // in a parent listing (where no engine resolves against it).
  markVaultStatus(extensionRegistry, space, list)
}
