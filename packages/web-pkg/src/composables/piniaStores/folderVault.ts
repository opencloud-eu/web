import { defineStore } from 'pinia'
import { shallowRef, unref } from 'vue'
import type { FolderVaultEngine } from './extensionRegistry'

/**
 * Holds the unlocked engines for vaults across the running session. Lives in
 * memory only on purpose - a page reload requires re-unlocking, which matches
 * what most users expect from a protected vault. A plugin (e.g.
 * `web-app-rclone-crypt`) builds an engine in its unlock UI and stashes it
 * here; `resolveVault()` inside the same plugin then reads it back. A vault
 * counts as unlocked exactly when an engine is stored for it.
 *
 * The store is mechanism-agnostic: it only knows about `FolderVaultEngine`, the
 * common encrypt/decrypt interface. How an extension obtains one - a passphrase,
 * a derived key, a hardware token, an OAuth flow - is entirely the extension's
 * business and never reaches this store.
 *
 * Keys are `(spaceId, vaultRootPath)` rather than `(spaceId, vaultId)` by
 * design: the vault root path is the handle every callsite already has (the
 * route guard only has the path on cold reload), so path-based keying keeps
 * resolvers free of an extra path→id lookup. An engine does not depend on the
 * path it's filed under, so a vault root can be renamed without rebuilding it -
 * only this store has to be re-keyed, which `moveEngine` does from the rename
 * handler.
 */
export const useFolderVaultStore = defineStore('folder-vault', () => {
  // shallowRef, not ref: only the Map *reference* is reactive (every mutator
  // re-assigns it so isUnlocked re-evaluates). The engines themselves stay raw
  // - a deep-reactive proxy would change their identity and needlessly wrap a
  // cipher/closure that has no business being reactive.
  const engines = shallowRef<Map<string, FolderVaultEngine>>(new Map())

  const buildKey = (spaceId: string, vaultRoot: string) => `${spaceId}::${vaultRoot}`

  const getEngine = (spaceId: string, vaultRoot: string): FolderVaultEngine | undefined => {
    return unref(engines).get(buildKey(spaceId, vaultRoot))
  }

  const setEngine = (spaceId: string, vaultRoot: string, engine: FolderVaultEngine) => {
    unref(engines).set(buildKey(spaceId, vaultRoot), engine)
    // re-assign so Vue tracks the change
    engines.value = new Map(unref(engines))
  }

  const clearEngine = (spaceId: string, vaultRoot: string) => {
    unref(engines).delete(buildKey(spaceId, vaultRoot))
    engines.value = new Map(unref(engines))
  }

  /**
   * Re-file the engine of a vault whose root was renamed/moved from
   * `fromVaultRoot` to `toVaultRoot`. No-op when nothing is stored under the
   * old key, so it is safe to call for every rename. The engine stays valid
   * under its new key (it doesn't depend on the path it's filed under).
   */
  const moveEngine = (spaceId: string, fromVaultRoot: string, toVaultRoot: string) => {
    const fromKey = buildKey(spaceId, fromVaultRoot)
    if (!unref(engines).has(fromKey)) return
    const engine = unref(engines).get(fromKey)
    unref(engines).delete(fromKey)
    unref(engines).set(buildKey(spaceId, toVaultRoot), engine)
    engines.value = new Map(unref(engines))
  }

  /**
   * Drop every unlocked engine whose vault root sits at - or below -
   * `pathPrefix` inside the given space. Called when a resource gets deleted:
   * if the vault itself or any of its ancestors is gone, the cached engine is
   * now stale and would unlock content that no longer exists (or, worse,
   * content a different user re-created at the same name later).
   */
  const clearEnginesUnder = (spaceId: string, pathPrefix: string) => {
    if (!pathPrefix) return
    // Normalise: treat "/foo" as covering "/foo" and "/foo/anything", but not
    // "/foobar".
    const prefix = pathPrefix.replace(/\/+$/, '')
    const ownedKeyPrefix = `${spaceId}::`
    let changed = false
    for (const key of Array.from(unref(engines).keys())) {
      if (!key.startsWith(ownedKeyPrefix)) continue
      const vaultRoot = key.slice(ownedKeyPrefix.length)
      if (vaultRoot === prefix || vaultRoot.startsWith(`${prefix}/`)) {
        unref(engines).delete(key)
        changed = true
      }
    }
    if (changed) {
      engines.value = new Map(unref(engines))
    }
  }

  const isUnlocked = (spaceId: string, vaultRoot: string) => {
    return unref(engines).has(buildKey(spaceId, vaultRoot))
  }

  return { getEngine, setEngine, clearEngine, moveEngine, clearEnginesUnder, isUnlocked }
})

export type FolderVaultStore = ReturnType<typeof useFolderVaultStore>
