import { createPinia, setActivePinia } from 'pinia'
import { mock } from 'vitest-mock-extended'
import { useFolderVaultStore } from '../../../../src/composables/piniaStores/folderVault'
import { FolderVaultEngine } from '../../../../src/composables/piniaStores/extensionRegistry'

describe('useFolderVaultStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('stores, reads and clears an engine per (space, vault root)', () => {
    const store = useFolderVaultStore()
    const engine = mock<FolderVaultEngine>()
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
    // where a vault starts (findVaultRoot). Callers therefore always resolve
    // the root *before* hitting the store, so an inner path is never a key:
    // looking one up returns "not unlocked" rather than walking up to the root.
    const store = useFolderVaultStore()
    const engine = mock<FolderVaultEngine>()
    store.setEngine('space-1', '/my.vault', engine)

    expect(store.isUnlocked('space-1', '/my.vault/sub/file.txt')).toBe(false)
    expect(store.getEngine('space-1', '/my.vault/sub/file.txt')).toBeUndefined()
    // ...the root itself, which the caller resolves to, is the actual key
    expect(store.isUnlocked('space-1', '/my.vault')).toBe(true)
    expect(store.getEngine('space-1', '/my.vault')).toBe(engine)
  })

  describe('method "moveEngine"', () => {
    it('re-files an engine from the old vault root to the new one', () => {
      const store = useFolderVaultStore()
      const engine = mock<FolderVaultEngine>()
      store.setEngine('space-1', '/my.vault', engine)

      store.moveEngine('space-1', '/my.vault', '/archive.vault')

      expect(store.isUnlocked('space-1', '/my.vault')).toBe(false)
      expect(store.isUnlocked('space-1', '/archive.vault')).toBe(true)
      expect(store.getEngine('space-1', '/archive.vault')).toBe(engine)
    })

    it('is a no-op when nothing is stored under the old root', () => {
      const store = useFolderVaultStore()
      store.moveEngine('space-1', '/my.vault', '/archive.vault')
      expect(store.isUnlocked('space-1', '/archive.vault')).toBe(false)
    })
  })

  describe('method "clearEnginesUnder"', () => {
    it('evicts engines at or below the prefix but spares siblings', () => {
      const store = useFolderVaultStore()
      store.setEngine('space-1', '/docs.vault', mock<FolderVaultEngine>())
      store.setEngine('space-1', '/docs.vault/nested.vault', mock<FolderVaultEngine>())
      store.setEngine('space-1', '/docs.vault-notes', mock<FolderVaultEngine>())
      store.setEngine('space-2', '/docs.vault', mock<FolderVaultEngine>())

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
