import { defineStore } from 'pinia'
import { ref, unref } from 'vue'

/**
 * Holds the unlock secrets for vaults across the running session. Lives in
 * memory only on purpose — page reload requires re-unlocking, which matches
 * what most users expect from a passphrase-protected vault. Plugins (e.g.
 * `web-app-rclone-crypt`) write into this store from their unlock UI, and
 * `resolveVault()` inside the same plugin reads from it again to construct
 * an engine.
 *
 * The "secret" payload is opaque to web-pkg — each extension decides what to
 * stash there (a passphrase, a derived key, an OAuth token, …).
 *
 * Keys are `(spaceId, vaultRootPath)` rather than `(spaceId, vaultId)` by
 * design: in the rclone-crypt PoC the vault root path is the immutable
 * identity (the encryption salt is derived from the path, vault roots
 * can't be moved or renamed, and the route guard naturally has only the
 * path on cold reload). Path-based keying keeps every resolver callsite
 * free of an additional path→id lookup. If vault-root rename ever lands,
 * the rename handler will re-key the store on the rename event — the
 * stored payload outlives the key it's filed under.
 */
export const useFolderVaultStore = defineStore('folder-vault', () => {
  const secrets = ref<Map<string, unknown>>(new Map())

  const buildKey = (spaceId: string, vaultRoot: string) => `${spaceId}::${vaultRoot}`

  const getSecret = <T = unknown>(spaceId: string, vaultRoot: string): T | undefined => {
    return unref(secrets).get(buildKey(spaceId, vaultRoot)) as T | undefined
  }

  const setSecret = (spaceId: string, vaultRoot: string, secret: unknown) => {
    unref(secrets).set(buildKey(spaceId, vaultRoot), secret)
    // re-assign so Vue tracks the change
    secrets.value = new Map(unref(secrets))
  }

  const clearSecret = (spaceId: string, vaultRoot: string) => {
    unref(secrets).delete(buildKey(spaceId, vaultRoot))
    secrets.value = new Map(unref(secrets))
  }

  /**
   * Drop every cached secret whose vault root sits at — or below — `pathPrefix`
   * inside the given space. Called when a resource gets deleted: if the vault
   * itself or any of its ancestors is gone, the cached passphrase is now
   * stale and would unlock content that no longer exists (or, worse, content
   * a different user re-created at the same name later).
   */
  const clearSecretsUnder = (spaceId: string, pathPrefix: string) => {
    if (!pathPrefix) return
    // Normalise: treat "/foo" as covering "/foo" and "/foo/anything", but not
    // "/foobar".
    const prefix = pathPrefix.replace(/\/+$/, '')
    const ownedKeyPrefix = `${spaceId}::`
    let changed = false
    for (const key of Array.from(unref(secrets).keys())) {
      if (!key.startsWith(ownedKeyPrefix)) continue
      const vaultRoot = key.slice(ownedKeyPrefix.length)
      if (vaultRoot === prefix || vaultRoot.startsWith(`${prefix}/`)) {
        unref(secrets).delete(key)
        changed = true
      }
    }
    if (changed) {
      secrets.value = new Map(unref(secrets))
    }
  }

  const isUnlocked = (spaceId: string, vaultRoot: string) => {
    return unref(secrets).has(buildKey(spaceId, vaultRoot))
  }

  return { getSecret, setSecret, clearSecret, clearSecretsUnder, isUnlocked }
})

export type FolderVaultStore = ReturnType<typeof useFolderVaultStore>
