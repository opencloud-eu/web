import { FolderVaultEngine } from '../../../src/composables/piniaStores/extensionRegistry'
import { decryptVaultPath, encryptVaultPath } from '../../../src/helpers/vaultEngine'

// A fake engine that just wraps the relative path it receives, so the tests
// assert the generic vault-root <-> full-path conversion, not any real crypto.
function fakeEngine(vaultRoot: string): FolderVaultEngine {
  return {
    vaultRoot,
    encryptPath: (relative) => Promise.resolve(`E(${relative})`),
    decryptPath: (relative) => Promise.resolve(`D(${relative})`),
    encryptContent: (s) => s,
    decryptContent: (s) => s,
    verifyKey: () => Promise.resolve(true)
  }
}

describe('encryptVaultPath / decryptVaultPath', () => {
  it('strips the vault root, hands the WHOLE relative path to the engine, re-roots the result', async () => {
    const engine = fakeEngine('/my.vault')

    // the engine sees "sub/x" (the whole relative path, not split into segments)
    expect(await encryptVaultPath(engine, '/my.vault/sub/x')).toBe('/my.vault/E(sub/x)')
    expect(await decryptVaultPath(engine, '/my.vault/sub/x')).toBe('/my.vault/D(sub/x)')
  })

  it('handles the root vault "/" (whole space is the vault) without a double slash', async () => {
    const engine = fakeEngine('/')

    const encrypted = await encryptVaultPath(engine, '/sub/x')
    expect(encrypted).toBe('/E(sub/x)')
    expect(encrypted).not.toContain('//')
    expect(await decryptVaultPath(engine, '/enc/x')).toBe('/D(enc/x)')
  })

  it('hands the engine the identical relative path for an owner and a share-root vault', async () => {
    // owner `/my.vault/sub/x` and receiver `/sub/x` both reduce to "sub/x", which
    // is what makes the receiver decrypt the owner's blobs (same key + relative).
    expect(await encryptVaultPath(fakeEngine('/my.vault'), '/my.vault/sub/x')).toBe(
      '/my.vault/E(sub/x)'
    )
    expect(await encryptVaultPath(fakeEngine('/'), '/sub/x')).toBe('/E(sub/x)')
  })

  it('leaves the vault root itself untouched, without calling the engine', async () => {
    expect(await encryptVaultPath(fakeEngine('/my.vault'), '/my.vault')).toBe('/my.vault')
    expect(await encryptVaultPath(fakeEngine('/'), '/')).toBe('/')
  })
})
