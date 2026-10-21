import { createPinia, setActivePinia } from 'pinia'
import { mock } from 'vitest-mock-extended'
import { useVaultStore } from '../../../../src/composables/piniaStores/vault'
import { VaultEngine } from '../../../../src/composables/piniaStores/extensionRegistry'
import { decryptVaultPath, encryptVaultPath } from '../../../../src/helpers/vaultEngine'

// wraps the relative path it gets, so the tests can tell what the engine saw
function fakeEngine(vaultRoot: string): VaultEngine {
  return {
    vaultRoot,
    encryptPath: (relative) => Promise.resolve(`E(${relative})`),
    decryptPath: (relative) => Promise.resolve(`D(${relative})`),
    encryptContent: (s) => s,
    decryptContent: (s) => s,
    verifySegment: () => Promise.resolve(true),
    createIntegrityToken: () => Promise.resolve('token'),
    verifyIntegrityToken: () => Promise.resolve(true)
  }
}

describe('useVaultStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('stores, reads and clears an engine per (space, vault root)', () => {
    const store = useVaultStore()
    const engine = mock<VaultEngine>()
    store.setEngine('space-1', '/my.vault', engine)

    expect(store.isUnlocked('space-1', '/my.vault')).toBe(true)
    expect(store.getEngine('space-1', '/my.vault')).toBe(engine)
    // different space / path must not collide
    expect(store.isUnlocked('space-2', '/my.vault')).toBe(false)

    store.clearEngine('space-1', '/my.vault')
    expect(store.isUnlocked('space-1', '/my.vault')).toBe(false)
  })

  it('keys strictly by the vault root, not by paths inside the vault', () => {
    // The store has no notion of vault boundaries - only the extension knows
    // where a vault starts (findExtensionRoot). Callers therefore always resolve
    // the root *before* hitting the store, so an inner path is never a key:
    // looking one up returns "not unlocked" rather than walking up to the root.
    const store = useVaultStore()
    const engine = mock<VaultEngine>()
    store.setEngine('space-1', '/my.vault', engine)

    expect(store.isUnlocked('space-1', '/my.vault/sub/file.txt')).toBe(false)
    expect(store.getEngine('space-1', '/my.vault/sub/file.txt')).toBeUndefined()
    // ...the root itself, which the caller resolves to, is the actual key
    expect(store.isUnlocked('space-1', '/my.vault')).toBe(true)
    expect(store.getEngine('space-1', '/my.vault')).toBe(engine)
  })

  describe('method "moveEngine"', () => {
    it('re-files an engine from the old vault root to the new one', () => {
      const store = useVaultStore()
      const engine = mock<VaultEngine>()
      store.setEngine('space-1', '/my.vault', engine)

      store.moveEngine('space-1', '/my.vault', '/archive.vault')

      expect(store.isUnlocked('space-1', '/my.vault')).toBe(false)
      expect(store.isUnlocked('space-1', '/archive.vault')).toBe(true)
      expect(store.getEngine('space-1', '/archive.vault')).toBe(engine)
    })

    it('is a no-op when nothing is stored under the old root', () => {
      const store = useVaultStore()
      store.moveEngine('space-1', '/my.vault', '/archive.vault')
      expect(store.isUnlocked('space-1', '/archive.vault')).toBe(false)
    })

    it.each(['/me.vault', '/my-longer-name.vault'])(
      're-roots the engine so paths map to the new root "%s"',
      async (toVaultRoot) => {
        const store = useVaultStore()
        store.setEngine('space-1', '/my.vault', fakeEngine('/my.vault'))

        store.moveEngine('space-1', '/my.vault', toVaultRoot)

        const engine = store.getEngine('space-1', toVaultRoot)
        expect(engine.vaultRoot).toBe(toVaultRoot)
        expect(await encryptVaultPath(engine, toVaultRoot)).toBe(toVaultRoot)
        expect(await encryptVaultPath(engine, `${toVaultRoot}/notes.txt`)).toBe(
          `${toVaultRoot}/E(notes.txt)`
        )
        expect(await decryptVaultPath(engine, `${toVaultRoot}/E(notes.txt)`)).toBe(
          `${toVaultRoot}/D(E(notes.txt))`
        )
      }
    )

    it('moves and re-roots the engines of vaults inside a renamed folder', () => {
      const store = useVaultStore()
      const nested = fakeEngine('/docs/sub/my.vault')
      const sibling = fakeEngine('/docs-old/my.vault')
      const otherSpace = fakeEngine('/docs/my.vault')
      store.setEngine('space-1', '/docs/sub/my.vault', nested)
      store.setEngine('space-1', '/docs-old/my.vault', sibling)
      store.setEngine('space-2', '/docs/my.vault', otherSpace)

      store.moveEngine('space-1', '/docs', '/papers')

      expect(store.isUnlocked('space-1', '/docs/sub/my.vault')).toBe(false)
      expect(store.getEngine('space-1', '/papers/sub/my.vault')).toBe(nested)
      expect(nested.vaultRoot).toBe('/papers/sub/my.vault')
      // sibling whose name merely starts with the old path and other spaces stay untouched
      expect(store.getEngine('space-1', '/docs-old/my.vault')).toBe(sibling)
      expect(sibling.vaultRoot).toBe('/docs-old/my.vault')
      expect(store.getEngine('space-2', '/docs/my.vault')).toBe(otherSpace)
      expect(otherSpace.vaultRoot).toBe('/docs/my.vault')
    })

    it('leaves the engine of a space or share vault rooted at "/" alone', () => {
      const store = useVaultStore()
      const engine = fakeEngine('/')
      store.setEngine('space-1', '/', engine)

      store.moveEngine('space-1', '/', '/renamed.vault')

      expect(store.getEngine('space-1', '/')).toBe(engine)
      expect(engine.vaultRoot).toBe('/')
    })
  })

  describe('method "clearEnginesUnder"', () => {
    it('evicts engines at or below the prefix but spares siblings', () => {
      const store = useVaultStore()
      store.setEngine('space-1', '/docs.vault', mock<VaultEngine>())
      store.setEngine('space-1', '/docs.vault/nested.vault', mock<VaultEngine>())
      store.setEngine('space-1', '/docs.vault-notes', mock<VaultEngine>())
      store.setEngine('space-2', '/docs.vault', mock<VaultEngine>())

      store.clearEnginesUnder('space-1', '/docs.vault')

      expect(store.isUnlocked('space-1', '/docs.vault')).toBe(false)
      expect(store.isUnlocked('space-1', '/docs.vault/nested.vault')).toBe(false)
      // sibling whose name merely starts with the prefix must survive
      expect(store.isUnlocked('space-1', '/docs.vault-notes')).toBe(true)
      // other space must survive
      expect(store.isUnlocked('space-2', '/docs.vault')).toBe(true)
    })
  })
})
