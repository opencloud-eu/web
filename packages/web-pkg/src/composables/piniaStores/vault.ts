import { defineStore } from 'pinia'
import { shallowRef, unref } from 'vue'
import type { VaultEngine } from './extensionRegistry'

/**
 * Holds the unlocked engines for vaults across the running session. Lives in
 * memory only on purpose - a page reload requires re-unlocking, which matches
 * what most users expect from a protected vault. A plugin (e.g.
 * `web-app-rclone-crypt`) builds an engine in its unlock UI and stashes it
 * here; `resolveVault()` inside the same plugin then reads it back. A vault
 * counts as unlocked exactly when an engine is stored for it.
 *
 * The store is mechanism-agnostic: it only knows about `VaultEngine`, the
 * common encrypt/decrypt interface. How an extension obtains one - a passphrase,
 * a derived key, a hardware token, an OAuth flow - is entirely the extension's
 * business and never reaches this store.
 *
 * Keys are `(spaceId, vaultRootPath)` rather than `(spaceId, vaultId)` by
 * design: the vault root path is the handle every callsite already has (the
 * route guard only has the path on cold reload), so path-based keying keeps
 * resolvers free of an extra path→id lookup. The key material doesn't depend on
 * the path, so a renamed vault root needs no re-unlock - but its store key and
 * the engine's `vaultRoot` (which maps clear-text paths) do, which `moveEngine`
 * updates from the rename handler.
 */
export const useVaultStore = defineStore('vault', () => {
  // shallowRef, not ref: only the Map *reference* is reactive (every mutator
  // re-assigns it so isUnlocked re-evaluates). The engines themselves stay raw
  // - a deep-reactive proxy would change their identity and needlessly wrap a
  // cipher/closure that has no business being reactive.
  const engines = shallowRef<Map<string, VaultEngine>>(new Map())

  const buildKey = (spaceId: string, vaultRoot: string) => `${spaceId}::${vaultRoot}`

  const getEngine = (spaceId: string, vaultRoot: string): VaultEngine | undefined => {
    return unref(engines).get(buildKey(spaceId, vaultRoot))
  }

  const setEngine = (spaceId: string, vaultRoot: string, engine: VaultEngine) => {
    unref(engines).set(buildKey(spaceId, vaultRoot), engine)
    // re-assign so Vue tracks the change
    engines.value = new Map(unref(engines))
  }

  const clearEngine = (spaceId: string, vaultRoot: string) => {
    unref(engines).delete(buildKey(spaceId, vaultRoot))
    engines.value = new Map(unref(engines))
  }

  /**
   * Vault roots of the space's engines that sit at - or below - `path`: "/foo"
   * covers "/foo" and "/foo/anything", but not "/foobar".
   */
  const vaultRootsUnder = (spaceId: string, path: string): string[] => {
    const ownedKeyPrefix = `${spaceId}::`
    return Array.from(unref(engines).keys())
      .filter((key) => key.startsWith(ownedKeyPrefix))
      .map((key) => key.slice(ownedKeyPrefix.length))
      .filter((vaultRoot) => vaultRoot === path || vaultRoot.startsWith(`${path}/`))
  }

  /**
   * Re-file the engines of the vaults at - or below - `fromPath` after it got
   * renamed to `toPath`: the vault root itself, or a folder holding vaults. Each
   * engine gets its new key and its `vaultRoot` re-rooted, so paths map to the
   * new location while the vault stays unlocked. No-op when nothing is stored
   * there, so it is safe to call for every rename.
   */
  const moveEngine = (spaceId: string, fromPath: string, toPath: string) => {
    const from = fromPath.replace(/\/+$/, '')
    const to = toPath.replace(/\/+$/, '')
    // the space root itself can't be renamed
    if (!from || !to || from === to) {
      return
    }
    const vaultRoots = vaultRootsUnder(spaceId, from)
    if (!vaultRoots.length) {
      return
    }
    const movedEngines = vaultRoots.map((vaultRoot) => {
      const engine = unref(engines).get(buildKey(spaceId, vaultRoot))
      unref(engines).delete(buildKey(spaceId, vaultRoot))
      // re-root in place: the engine keeps its identity and key material
      engine.vaultRoot = to + vaultRoot.slice(from.length)
      return engine
    })
    for (const engine of movedEngines) {
      unref(engines).set(buildKey(spaceId, engine.vaultRoot), engine)
    }
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
    const vaultRoots = vaultRootsUnder(spaceId, pathPrefix.replace(/\/+$/, ''))
    if (!vaultRoots.length) {
      return
    }
    for (const vaultRoot of vaultRoots) {
      unref(engines).delete(buildKey(spaceId, vaultRoot))
    }
    engines.value = new Map(unref(engines))
  }

  const isUnlocked = (spaceId: string, vaultRoot: string) => {
    return unref(engines).has(buildKey(spaceId, vaultRoot))
  }

  return { getEngine, setEngine, clearEngine, moveEngine, clearEnginesUnder, isUnlocked }
})

export type VaultStore = ReturnType<typeof useVaultStore>
